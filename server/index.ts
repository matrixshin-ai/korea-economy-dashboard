import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import cron from "node-cron";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      
      cron.schedule('0 7 * * *', async () => {
        log('Starting daily 07:00 KST update...', 'scheduler');
        try {
          await execAsync("python jobs/fetch_indicators.py", { timeout: 60000 });
          log('fetch_indicators.py completed', 'scheduler');
          await execAsync("python jobs/fetch_economic_calendar.py", { timeout: 60000 });
          log('fetch_economic_calendar.py completed', 'scheduler');
          await execAsync("python jobs/fetch_korea_stats.py", { timeout: 60000 });
          log('fetch_korea_stats.py completed', 'scheduler');
          await execAsync("python jobs/poll.py", { timeout: 120000 });
          log('poll.py completed', 'scheduler');
          await execAsync("python jobs/render.py", { timeout: 60000 });
          log('render.py completed', 'scheduler');
          log('Daily 07:00 KST update completed successfully!', 'scheduler');
        } catch (error) {
          log(`Daily update failed: ${error}`, 'scheduler');
        }
      }, {
        timezone: "Asia/Seoul"
      });
      
      log('Scheduler initialized: Daily update at 07:00 KST', 'scheduler');
      
      setTimeout(async () => {
        try {
          const briefingPath = path.join(process.cwd(), "latest_briefing.json");
          let needsUpdate = true;
          
          if (fs.existsSync(briefingPath)) {
            const data = JSON.parse(fs.readFileSync(briefingPath, "utf-8"));
            const now = new Date();
            const kstOffset = 9 * 60 * 60 * 1000;
            const todayKST = new Date(now.getTime() + kstOffset).toISOString().slice(0, 10);
            
            if (data.date === todayKST && data.generated_at) {
              const genTime = new Date(data.generated_at);
              const genHourKST = new Date(genTime.getTime() + kstOffset).getHours();
              needsUpdate = genHourKST < 7;
            }
          }
          
          if (needsUpdate) {
            log('Startup: Data is stale, triggering background update...', 'startup');
            const response = await fetch(`http://localhost:${port}/api/warmup`);
            const result = await response.json();
            log(`Startup: Warmup result: ${JSON.stringify(result)}`, 'startup');
          } else {
            log('Startup: Data is fresh, no update needed', 'startup');
          }
        } catch (error) {
          log(`Startup: Auto-update failed: ${error}`, 'startup');
        }
      }, 5000);
    },
  );
})();
