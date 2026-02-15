import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEssaySchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { GoogleGenAI } from "@google/genai";
import archiver from "archiver";

const execAsync = promisify(exec);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

interface RssNewsItem {
  title: string;
  summary: string;
  link: string;
  source: string;
  published: string;
  score: number;
}

interface BriefingData {
  generated_at: string;
  date: string;
  sections: {
    [key: string]: RssNewsItem[];
  };
}

const SECTION_MAP: { [key: string]: string } = {
  "거시경제·재정": "Macro",
  "거시경제": "Macro",
  "재정": "Macro",
  "금융시장": "Finance",
  "부동산": "RealEstate",
  "국제경제": "International",
  "산업·과학": "Industry",
  "산업": "Industry",
  "기타": "Others"
};

let isUpdating = false;
let lastUpdateCheck = 0;
let lastUpdateAttempt = 0;
let updateError: string | null = null;
const UPDATE_CHECK_INTERVAL = 30000;
const MIN_UPDATE_INTERVAL = 5 * 60 * 1000;

function getMostRecentKST7AM(): Date {
  const now = new Date();
  const nowUtcMs = now.getTime();
  
  const todayUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  );
  
  const todayKst7amInUtc = todayUtcMidnight - 2 * 60 * 60 * 1000;
  
  if (nowUtcMs >= todayKst7amInUtc) {
    return new Date(todayKst7amInUtc);
  } else {
    return new Date(todayKst7amInUtc - 24 * 60 * 60 * 1000);
  }
}

function isDataStale(): { stale: boolean; reason: string; ageHours: number } {
  const kst7AM = getMostRecentKST7AM();
  const briefingPath = path.join(process.cwd(), "latest_briefing.json");
  const now = new Date();

  try {
    if (!fs.existsSync(briefingPath)) {
      return { stale: true, reason: "no_briefing_file", ageHours: -1 };
    }

    const data = JSON.parse(fs.readFileSync(briefingPath, "utf-8"));
    if (!data.generated_at) {
      return { stale: true, reason: "no_generated_at", ageHours: -1 };
    }

    const genTime = new Date(data.generated_at);
    const ageMs = now.getTime() - genTime.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours > 24) {
      return { stale: true, reason: "older_than_24h", ageHours };
    }

    if (genTime < kst7AM) {
      return { stale: true, reason: "before_today_7am", ageHours };
    }

    return { stale: false, reason: "fresh", ageHours };
  } catch (err) {
    return { stale: true, reason: "parse_error", ageHours: -1 };
  }
}

async function ensureUpToDate(force = false): Promise<{ updated: boolean; reason: string }> {
  const now = Date.now();
  
  if (!force && now - lastUpdateCheck < UPDATE_CHECK_INTERVAL) {
    return { updated: false, reason: "check_interval" };
  }
  lastUpdateCheck = now;

  if (isUpdating) {
    if (force) {
      let waited = 0;
      while (isUpdating && waited < 300000) {
        await new Promise(r => setTimeout(r, 5000));
        waited += 5000;
      }
      if (!isUpdating) {
        const recheckStale = isDataStale();
        if (!recheckStale.stale) return { updated: true, reason: "waited_for_existing" };
      }
    }
    if (isUpdating) return { updated: false, reason: "already_updating" };
  }

  if (!force && now - lastUpdateAttempt < MIN_UPDATE_INTERVAL) {
    return { updated: false, reason: "min_interval" };
  }

  const staleCheck = isDataStale();
  if (!staleCheck.stale) {
    return { updated: false, reason: "data_fresh" };
  }

  isUpdating = true;
  lastUpdateAttempt = now;
  updateError = null;
  
  console.log(`[ensureUpToDate] Data is stale (reason: ${staleCheck.reason}, age: ${staleCheck.ageHours.toFixed(1)}h). Running update...`);
  
  try {
    console.log("[ensureUpToDate] Step 1/5: Fetching indicators...");
    await execAsync("python jobs/fetch_indicators.py", { timeout: 90000 });
    
    console.log("[ensureUpToDate] Step 2/5: Fetching economic calendar...");
    await execAsync("python jobs/fetch_economic_calendar.py", { timeout: 90000 });
    
    console.log("[ensureUpToDate] Step 3/5: Fetching Korea stats...");
    await execAsync("python jobs/fetch_korea_stats.py", { timeout: 90000 });
    
    console.log("[ensureUpToDate] Step 4/5: Polling RSS + Naver...");
    await execAsync("python jobs/poll.py", { timeout: 180000 });
    
    console.log("[ensureUpToDate] Step 5/5: Rendering briefing...");
    await execAsync("python render.py", { timeout: 120000 });
    
    console.log("[ensureUpToDate] Update completed successfully!");
    
    setTimeout(() => {
      generateSummaries().catch(err => console.error("[ensureUpToDate] Summary generation failed:", err));
    }, 2000);
    
    return { updated: true, reason: "success" };
  } catch (error: any) {
    updateError = error?.message || "Unknown error";
    console.error("[ensureUpToDate] Update failed:", updateError);
    return { updated: false, reason: "error" };
  } finally {
    isUpdating = false;
  }
}

async function generateSummaries(): Promise<void> {
  const ai = new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
    },
  });

  const briefingPath = path.join(process.cwd(), "latest_briefing.json");
  if (!fs.existsSync(briefingPath)) {
    console.log("[generateSummaries] No briefing file found");
    return;
  }

  const data = fs.readFileSync(briefingPath, "utf-8");
  const briefing = JSON.parse(data);
  
  const newsContent: string[] = [];
  newsContent.push(`Date: ${briefing.date}`);
  newsContent.push("\n=== Top 5 Stories ===");
  for (const item of briefing.top5 || []) {
    newsContent.push(`- ${item.title}: ${item.summary || ''}`);
  }
  
  for (const [section, items] of Object.entries(briefing.sections || {})) {
    newsContent.push(`\n=== ${section} ===`);
    for (const item of (items as any[]).slice(0, 5)) {
      newsContent.push(`- ${item.title}: ${item.summary || ''}`);
    }
  }

  for (const lang of ['KR', 'EN'] as const) {
    console.log(`[generateSummaries] Generating ${lang} summary...`);
    
    const prompt = lang === 'KR' 
      ? `당신은 한국의 저명한 경제 전문 앵커입니다. 다음 뉴스들을 읽고, 5분 분량의 뉴스 방송 나레이션을 작성해주세요.

요구사항:
- 청취자에게 직접 말하듯이 자연스럽고 전문적인 톤으로 작성
- "안녕하십니까, 오늘의 한국 경제 뉴스를 전해드립니다"로 시작
- 각 주요 뉴스를 상세히 설명하고 경제적 의미와 배경을 분석
- 관련 뉴스들을 자연스럽게 연결하여 전체 경제 흐름을 보여줌
- 마무리에는 투자자와 일반 시청자를 위한 시사점 제시
- 반드시 2000-2500자 분량으로 작성 (5분 읽기 분량)
- 문단 구분을 명확히 하여 읽기 쉽게 구성

뉴스 내용:
${newsContent.join('\n')}`
      : `You are a distinguished Korean economic news anchor. Read the following news and write a 5-minute news broadcast narration.

Requirements:
- Write in a natural and professional tone as if speaking directly to listeners
- Start directly with "Good morning. Here is today's Korean economic news briefing." - DO NOT introduce yourself or say "I'm your host" or use placeholders like "[Your Name]"
- Explain each major news item in detail, analyzing its economic significance and background
- Connect related news naturally to show the overall economic flow
- Include implications for investors and general viewers at the end
- Write exactly 800-1000 words (5-minute reading length)
- Use clear paragraph breaks for easy reading

News content:
${newsContent.join('\n')}`;

    try {
      let summary = "";
      const maxAttempts = lang === 'EN' ? 5 : 1;
      let attempts = 0;
      let bestSummary = "";
      let bestKoreanCount = Infinity;

      while (attempts < maxAttempts) {
        attempts++;
        
        const retryPrompt = (lang === 'EN' && attempts > 1)
          ? `${prompt}\n\n[SYSTEM WARNING: Previous attempts contained Korean text. You MUST write ONLY in English. Any Korean characters will cause the response to be rejected. Translate ALL Korean content to English.]`
          : prompt;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: retryPrompt,
        });
        summary = response.text || "";

        if (lang === 'EN') {
          const { count, percentage } = countKoreanChars(summary);
          console.log(`[generateSummaries] EN attempt ${attempts}: Korean chars=${count} (${percentage.toFixed(2)}%)`);
          
          if (count < bestKoreanCount) {
            bestKoreanCount = count;
            bestSummary = summary;
          }
          
          if (count === 0) {
            console.log(`[generateSummaries] EN success on attempt ${attempts}`);
            break;
          }
          
          if (attempts < maxAttempts) continue;
          
          console.log(`[generateSummaries] EN max attempts reached. Best had ${bestKoreanCount} Korean chars.`);
          summary = bestSummary;
          if (bestKoreanCount > 0) {
            summary = removeKoreanText(summary);
          }
        } else {
          break;
        }
      }

      const finalCheck = lang === 'EN' ? countKoreanChars(summary) : { count: 0, percentage: 0 };
      
      if (lang === 'EN' && finalCheck.count > 0) {
        console.log(`[generateSummaries] EN summary still has ${finalCheck.count} Korean chars after cleanup - NOT caching`);
        continue;
      }

      const result = { 
        summary,
        date: briefing.date,
        generated_at: new Date().toISOString(),
        lang,
        validation: lang === 'EN' ? {
          korean_detected: false,
          korean_chars: 0,
          korean_percentage: 0,
          attempts,
          cleanup_applied: bestKoreanCount > 0
        } : undefined
      };
      
      const summaryPath = path.join(process.cwd(), `cached_summary_${lang.toLowerCase()}.json`);
      fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2));
      console.log(`[generateSummaries] ${lang} summary saved (${summary.length} chars)`);
    } catch (error) {
      console.error(`[generateSummaries] Failed to generate ${lang} summary:`, error);
    }
  }
}

function countKoreanChars(text: string): { count: number; percentage: number } {
  const koreanMatches = text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || [];
  const count = koreanMatches.length;
  const percentage = text.length > 0 ? (count / text.length) * 100 : 0;
  return { count, percentage };
}

function removeKoreanText(text: string): string {
  return text
    .replace(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function loadRealNews(): any {
  const briefingPath = path.join(process.cwd(), "latest_briefing.json");
  
  try {
    const data = fs.readFileSync(briefingPath, "utf-8");
    const briefing: BriefingData = JSON.parse(data);
    
    const categories: { [key: string]: any[] } = {};
    let idCounter = 1;
    
    for (const [korSection, items] of Object.entries(briefing.sections)) {
      const engSection = SECTION_MAP[korSection] || korSection;
      categories[engSection] = items.map((item) => {
        const publishedDate = item.published ? new Date(item.published) : new Date();
        return {
          id: `rss-${idCounter++}`,
          title: item.title,
          summary: item.summary || "",
          source: item.source.replace(/\s*[-|:]\s*.*$/, ""),
          date: publishedDate.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(".", ".").slice(0, -1),
          category: engSection,
          important: item.score >= 20,
          url: item.link,
          content: item.summary
        };
      });
    }
    
    return {
      categories,
      generatedAt: briefing.generated_at,
      date: briefing.date
    };
  } catch (error) {
    console.error("Failed to load real news:", error);
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);
  registerAuthRoutes(app);

  const isAdmin = (req: any, res: any, next: any) => {
    const userEmail = req.user?.claims?.email;
    if (!userEmail || userEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
  };

  app.get("/api/essays", async (_req, res) => {
    try {
      const essays = await storage.getEssays();
      res.json(essays);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/essays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const essay = await storage.getEssay(id);
      if (!essay) {
        return res.status(404).json({ message: "Essay not found" });
      }
      res.json(essay);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/essays", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validationResult = insertEssaySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: fromZodError(validationResult.error).message 
        });
      }
      const essay = await storage.createEssay(validationResult.data);
      res.status(201).json(essay);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/essays/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const essay = await storage.updateEssay(id, req.body);
      if (!essay) {
        return res.status(404).json({ message: "Essay not found" });
      }
      res.json(essay);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/essays/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEssay(id);
      if (!deleted) {
        return res.status(404).json({ message: "Essay not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/indicators", async (_req, res) => {
    await ensureUpToDate();
    try {
      const indicatorsPath = path.join(process.cwd(), "latest_indicators.json");
      if (fs.existsSync(indicatorsPath)) {
        const data = fs.readFileSync(indicatorsPath, "utf-8");
        const parsed = JSON.parse(data);
        res.json(parsed);
      } else {
        const { INDICATORS } = await import("../client/src/lib/mockData");
        res.json({ updated_at: new Date().toISOString(), indicators: INDICATORS });
      }
    } catch (error) {
      console.error("Failed to load indicators:", error);
      const { INDICATORS } = await import("../client/src/lib/mockData");
      res.json({ updated_at: new Date().toISOString(), indicators: INDICATORS });
    }
  });

  app.get("/api/news", async (_req, res) => {
    await ensureUpToDate();
    const realNews = loadRealNews();
    if (realNews) {
      res.json(realNews.categories);
    } else {
      const { NEWS_DATA } = await import("../client/src/lib/mockData");
      const categories: { [key: string]: any[] } = {};
      for (const item of NEWS_DATA) {
        if (!categories[item.category]) {
          categories[item.category] = [];
        }
        categories[item.category].push(item);
      }
      res.json(categories);
    }
  });

  app.get("/api/news/meta", async (_req, res) => {
    await ensureUpToDate();
    const realNews = loadRealNews();
    const staleCheck = isDataStale();
    
    if (realNews) {
      res.json({
        generatedAt: realNews.generatedAt,
        date: realNews.date,
        isRealData: true,
        isUpdating,
        isStale: staleCheck.stale,
        staleReason: staleCheck.reason,
        ageHours: staleCheck.ageHours
      });
    } else {
      res.json({
        generatedAt: null,
        date: null,
        isRealData: false,
        isUpdating,
        isStale: true,
        staleReason: "no_data"
      });
    }
  });

  app.get("/api/update-status", (_req, res) => {
    const staleCheck = isDataStale();
    res.json({
      isUpdating,
      isStale: staleCheck.stale,
      staleReason: staleCheck.reason,
      ageHours: staleCheck.ageHours,
      lastError: updateError
    });
  });

  app.post("/api/news/refresh", async (_req, res) => {
    try {
      await execAsync("python jobs/poll.py", { timeout: 180000 });
      await execAsync("python render.py", { timeout: 120000 });
      const realNews = loadRealNews();
      res.json({
        success: true,
        message: "News refreshed successfully",
        generatedAt: realNews?.generatedAt,
        date: realNews?.date
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  app.get("/api/daily-summary", async (_req, res) => {
    const { DAILY_SUMMARY, AUDIO_SCRIPT_KR, AUDIO_SCRIPT_EN } = await import("../client/src/lib/mockData");
    res.json({
      summary: DAILY_SUMMARY,
      audioScriptKr: AUDIO_SCRIPT_KR,
      audioScriptEn: AUDIO_SCRIPT_EN,
    });
  });

  app.get("/api/economic-calendar", async (_req, res) => {
    try {
      const calendarPath = path.join(process.cwd(), "latest_economic_calendar.json");
      if (fs.existsSync(calendarPath)) {
        const data = fs.readFileSync(calendarPath, "utf-8");
        const parsed = JSON.parse(data);
        res.json(parsed);
      } else {
        res.json({ indicators_by_country: {}, countries: [] });
      }
    } catch (error) {
      console.error("Failed to load economic calendar:", error);
      res.json({ indicators_by_country: {}, countries: [] });
    }
  });

  app.get("/api/korea-stats", async (_req, res) => {
    try {
      const statsPath = path.join(process.cwd(), "latest_korea_stats.json");
      if (fs.existsSync(statsPath)) {
        const data = fs.readFileSync(statsPath, "utf-8");
        const parsed = JSON.parse(data);
        res.json(parsed);
      } else {
        const { KOREA_STATS } = await import("../client/src/lib/mockData");
        res.json({ stats: KOREA_STATS, source: "Mock Data" });
      }
    } catch (error) {
      console.error("Failed to load Korea stats:", error);
      const { KOREA_STATS } = await import("../client/src/lib/mockData");
      res.json({ stats: KOREA_STATS, source: "Mock Data" });
    }
  });

  app.get("/download/docs", (_req, res) => {
    const docsDir = path.join(process.cwd(), "docs");
    if (!fs.existsSync(docsDir)) {
      res.status(404).send("Docs folder not found");
      return;
    }
    
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Korea Economy Dashboard - Consulting Docs</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
      h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
      h2 { color: #2c5282; margin-top: 40px; }
      pre { background: #f7fafc; padding: 15px; overflow-x: auto; border-radius: 5px; }
      code { background: #edf2f7; padding: 2px 6px; border-radius: 3px; }
      .file-section { border: 1px solid #e2e8f0; margin: 20px 0; padding: 20px; border-radius: 8px; }
      .file-title { background: #1a365d; color: white; padding: 10px 15px; margin: -20px -20px 20px -20px; border-radius: 8px 8px 0 0; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
      th { background: #f7fafc; }
    </style></head><body>
    <h1>Korea Economy Dashboard - Consulting Documentation</h1>
    <p>API 키는 ***으로 마스킹되어 있습니다. 각 섹션을 복사하여 사용하세요.</p>`;
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
      const escapedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      html += `<div class="file-section"><div class="file-title">${file}</div><pre>${escapedContent}</pre></div>`;
    }
    
    html += `</body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  app.get("/api/briefing", async (_req, res) => {
    await ensureUpToDate();
    try {
      const briefingPath = path.join(process.cwd(), "latest_briefing.json");
      if (fs.existsSync(briefingPath)) {
        const data = fs.readFileSync(briefingPath, "utf-8");
        const briefing = JSON.parse(data);
        res.json(briefing);
      } else {
        res.status(404).json({ 
          error: "Briefing not available",
          message: "Daily briefing has not been generated yet. It will be available after the scheduled 07:00 KST update."
        });
      }
    } catch (error) {
      console.error("Failed to load briefing:", error);
      res.status(500).json({ error: "Failed to load briefing data" });
    }
  });

  const ai = new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
    },
  });

  app.get("/api/briefing-summary", async (req, res) => {
    const lang = req.query.lang === 'EN' ? 'EN' : 'KR';
    const waitForUpdate = req.query.wait !== 'false';
    
    try {
      if (waitForUpdate) {
        const updateResult = await ensureUpToDate(true);
        console.log(`[briefing-summary] ensureUpToDate result: ${updateResult.reason}`);
      } else {
        const staleCheck = isDataStale();
        if (staleCheck.stale && !isUpdating) {
          ensureUpToDate(true).catch(err => console.error("[briefing-summary] bg update failed:", err));
        }
        if (isUpdating) {
          return res.status(202).json({ 
            status: "updating",
            message: "Data update in progress. Retry in 2-3 minutes.",
            isUpdating: true,
            retryAfterSeconds: 120
          });
        }
      }

      const briefingPath = path.join(process.cwd(), "latest_briefing.json");
      if (!fs.existsSync(briefingPath)) {
        return res.status(404).json({ error: "Briefing not available" });
      }

      const data = fs.readFileSync(briefingPath, "utf-8");
      const briefing = JSON.parse(data);
      
      const newsContent = [];
      newsContent.push(`Date: ${briefing.date}`);
      newsContent.push("\n=== Top 5 Stories ===");
      for (const item of briefing.top5 || []) {
        newsContent.push(`- ${item.title}: ${item.summary || ''}`);
      }
      
      for (const [section, items] of Object.entries(briefing.sections || {})) {
        newsContent.push(`\n=== ${section} ===`);
        for (const item of (items as any[]).slice(0, 3)) {
          newsContent.push(`- ${item.title}: ${item.summary || ''}`);
        }
      }

      const summaryPath = path.join(process.cwd(), `cached_summary_${lang.toLowerCase()}.json`);
      if (fs.existsSync(summaryPath)) {
        const cachedData = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
        if (cachedData.date === briefing.date) {
          if (lang === 'EN') {
            const { count } = countKoreanChars(cachedData.summary || "");
            if (count > 0) {
              console.log(`[briefing-summary] Cached EN summary has ${count} Korean chars - regenerating`);
            } else {
              return res.json(cachedData);
            }
          } else {
            return res.json(cachedData);
          }
        }
      }

      const prompt = lang === 'KR' 
        ? `당신은 한국의 저명한 경제 전문 앵커입니다. 다음 뉴스들을 읽고, 5분 분량의 뉴스 방송 나레이션을 작성해주세요.

요구사항:
- 청취자에게 직접 말하듯이 자연스럽고 전문적인 톤으로 작성
- "안녕하십니까, 오늘의 한국 경제 뉴스를 전해드립니다"로 시작
- 각 주요 뉴스를 상세히 설명하고 경제적 의미와 배경을 분석
- 관련 뉴스들을 자연스럽게 연결하여 전체 경제 흐름을 보여줌
- 마무리에는 투자자와 일반 시청자를 위한 시사점 제시
- 반드시 2000-2500자 분량으로 작성 (5분 읽기 분량)
- 문단 구분을 명확히 하여 읽기 쉽게 구성

뉴스 내용:
${newsContent.join('\n')}`
        : `You are a distinguished economic news anchor presenting Korean economic news to an international English-speaking audience.

CRITICAL: You MUST write the ENTIRE output in ENGLISH only. The news sources below are in Korean - you must TRANSLATE and summarize them into English.

Requirements:
- Write EVERYTHING in English - no Korean text whatsoever
- Write in a natural and professional broadcast tone
- Start with "Good morning. Here is today's Korean economic news briefing."
- DO NOT introduce yourself, say "I'm your host", or use placeholders like "[Your Name]"
- Translate and explain each major Korean news item for international audiences
- Analyze the economic significance and provide context for non-Korean listeners
- Connect related news to show the overall Korean economic landscape
- Include implications for international investors at the end
- Write exactly 800-1000 words (5-minute reading length)
- Use clear paragraph breaks for easy reading

Korean news content to translate and summarize:
${newsContent.join('\n')}`;

      let summary = "";
      let attempts = 0;
      const maxAttempts = 5;
      let bestSummary = "";
      let bestKoreanCount = Infinity;

      while (attempts < maxAttempts) {
        attempts++;
        
        const retryPrompt = attempts > 1 
          ? `${prompt}\n\n[SYSTEM WARNING: Previous attempts contained Korean text. You MUST write ONLY in English. Any Korean characters will cause the response to be rejected. Translate ALL Korean content to English.]`
          : prompt;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: retryPrompt,
        });
        summary = response.text || "";

        if (lang === 'EN') {
          const { count, percentage } = countKoreanChars(summary);
          console.log(`[EN Summary] Attempt ${attempts}: Korean chars=${count} (${percentage.toFixed(2)}%)`);
          
          if (count < bestKoreanCount) {
            bestKoreanCount = count;
            bestSummary = summary;
          }
          
          if (count === 0) {
            console.log(`[EN Summary] Success: No Korean detected on attempt ${attempts}`);
            break;
          }
          
          if (attempts < maxAttempts) {
            console.log(`[EN Summary] Retrying...`);
            continue;
          }
          
          console.log(`[EN Summary] Max attempts (${maxAttempts}) reached. Best result had ${bestKoreanCount} Korean chars.`);
          summary = bestSummary;
          
          if (bestKoreanCount > 0) {
            console.log(`[EN Summary] Applying Korean text removal as final cleanup...`);
            summary = removeKoreanText(summary);
          }
        }
        break;
      }

      const finalKoreanCheck = lang === 'EN' ? countKoreanChars(summary) : { count: 0, percentage: 0 };
      
      if (lang === 'EN' && finalKoreanCheck.count > 0) {
        console.log(`[briefing-summary] EN summary still has ${finalKoreanCheck.count} Korean chars after all retries - returning error`);
        return res.status(422).json({ 
          error: "Failed to generate clean English summary",
          korean_chars: finalKoreanCheck.count,
          message: "Retry the request to attempt regeneration"
        });
      }

      const result = { 
        summary,
        date: briefing.date,
        generated_at: new Date().toISOString(),
        lang,
        validation: lang === 'EN' ? { 
          korean_detected: false, 
          korean_chars: 0,
          korean_percentage: 0,
          attempts,
          cleanup_applied: bestKoreanCount > 0
        } : undefined
      };
      
      fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2));
      
      res.json(result);
    } catch (error) {
      console.error("Failed to generate summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  app.get("/api/warmup", async (_req, res) => {
    const staleCheck = isDataStale();
    
    if (!staleCheck.stale) {
      return res.json({ status: "fresh", message: "Data is already up to date", isUpdating });
    }
    
    if (isUpdating) {
      return res.json({ status: "updating", message: "Update already in progress", isUpdating: true });
    }
    
    ensureUpToDate(true).then(result => {
      console.log(`[warmup] Background update completed: ${result.reason}`);
    }).catch(err => {
      console.error(`[warmup] Background update failed:`, err);
    });
    
    res.json({ 
      status: "triggered", 
      message: "Update started in background. Poll /api/summary-status to check progress.",
      estimatedMinutes: 5,
      isUpdating: true
    });
  });

  app.get("/api/summary-status", async (req, res) => {
    const lang = (req.query.lang === 'EN' ? 'EN' : 'KR').toLowerCase();
    const triggerUpdate = req.query.trigger === 'true';
    
    try {
      if (triggerUpdate && !isUpdating) {
        ensureUpToDate(true).then(result => {
          console.log(`[summary-status] Triggered update completed: ${result.reason}`);
        }).catch(err => {
          console.error(`[summary-status] Triggered update failed:`, err);
        });
      }

      const briefingPath = path.join(process.cwd(), "latest_briefing.json");
      const summaryPath = path.join(process.cwd(), `cached_summary_${lang}.json`);
      
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const todayKST = new Date(now.getTime() + kstOffset).toISOString().slice(0, 10);
      
      let briefingDate = null;
      let briefingReady = false;
      if (fs.existsSync(briefingPath)) {
        const briefing = JSON.parse(fs.readFileSync(briefingPath, "utf-8"));
        briefingDate = briefing.date;
        briefingReady = briefing.date === todayKST;
      }
      
      let summaryDate = null;
      let summaryReady = false;
      let summaryGeneratedAt = null;
      if (fs.existsSync(summaryPath)) {
        const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
        summaryDate = summary.date;
        summaryGeneratedAt = summary.generated_at;
        summaryReady = summary.date === todayKST;
      }
      
      res.json({
        today: todayKST,
        briefing: { date: briefingDate, ready: briefingReady },
        summary: { date: summaryDate, ready: summaryReady, generated_at: summaryGeneratedAt },
        isUpdating,
        lastError: updateError,
        allReady: briefingReady && summaryReady
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  app.get("/api/download-project", (_req, res) => {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=korea-economy-project.zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      res.status(500).end();
    });
    archive.pipe(res);

    const basePath = process.cwd();
    const includeDirs = ["client", "server", "shared", "jobs", "src", "script", "tests"];
    const includeFiles = [
      "scoring.py", "render.py", "feeds.py", "main.py",
      "keyword_rules.json", "package.json", "pyproject.toml",
      "components.json", "replit.md", "run_briefing.sh",
      "vite-plugin-meta-images.ts", ".replit",
      "latest_briefing.json", "cache_candidates.json",
      "latest_indicators.json", "latest_economic_calendar.json",
      "latest_korea_stats.json", "kr_bond_history.json",
      "cached_summary_en.json", "cached_summary_kr.json"
    ];

    for (const dir of includeDirs) {
      const dirPath = path.join(basePath, dir);
      if (fs.existsSync(dirPath)) {
        archive.directory(dirPath, dir);
      }
    }

    for (const file of includeFiles) {
      const filePath = path.join(basePath, file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
      }
    }

    archive.finalize();
  });

  app.get("/api/download-scoring-logic", (_req, res) => {
    const filesToInclude = [
      { path: "scoring.py", name: "scoring.py" },
      { path: "feeds.py", name: "feeds.py" },
      { path: "jobs/poll.py", name: "jobs/poll.py" },
      { path: "jobs/render.py", name: "jobs/render.py" },
      { path: "src/naver_search.py", name: "src/naver_search.py" },
    ];

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=scoring_logic.zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      res.status(500).end();
    });
    archive.pipe(res);

    for (const file of filesToInclude) {
      const fullPath = path.join(process.cwd(), file.path);
      if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: file.name });
      }
    }

    archive.finalize();
  });

  return httpServer;
}
