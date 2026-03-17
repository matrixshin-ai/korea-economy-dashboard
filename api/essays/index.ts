import type { VercelRequest, VercelResponse } from "@vercel/node";

const REPO = "matrixshin-ai/korea-economy-dashboard";
const FILE_PATH = "jobs/data/essays.json";

interface EssayItem {
  id: number;
  author: string;
  title: string;
  content: string;
  createdAt: string;
}

async function readEssaysFromGitHub(): Promise<{ essays: EssayItem[]; sha: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    { headers: { Authorization: `token ${token}`, "User-Agent": "korea-economy-dashboard" } },
  );
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);

  const data = (await res.json()) as { content: string; sha: string };
  const json = Buffer.from(data.content, "base64").toString("utf-8");
  return { essays: JSON.parse(json), sha: data.sha };
}

async function writeEssaysToGitHub(essays: EssayItem[], sha: string, message: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  const content = Buffer.from(JSON.stringify(essays, null, 2) + "\n", "utf-8").toString("base64");
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "korea-economy-dashboard",
      },
      body: JSON.stringify({ message, content, sha }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub commit failed: ${res.status} ${err}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const { essays } = await readEssaysFromGitHub();
      return res.json(essays);
    }

    if (req.method === "POST") {
      const { author, title, content } = req.body || {};
      if (!author || !title || !content) {
        return res.status(400).json({ message: "author, title, content are required" });
      }

      const { essays, sha } = await readEssaysFromGitHub();
      const maxId = essays.reduce((m, e) => Math.max(m, e.id), 0);
      const essay: EssayItem = {
        id: maxId + 1,
        author,
        title,
        content,
        createdAt: new Date().toISOString(),
      };
      essays.unshift(essay);
      await writeEssaysToGitHub(essays, sha, `Add essay: ${title}`);
      return res.status(201).json(essay);
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const { essays, sha } = await readEssaysFromGitHub();
      const idx = essays.findIndex((e) => e.id === id);
      if (idx === -1) return res.status(404).json({ message: "Essay not found" });
      essays.splice(idx, 1);
      await writeEssaysToGitHub(essays, sha, `Delete essay #${id}`);
      return res.status(204).send(null);
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
