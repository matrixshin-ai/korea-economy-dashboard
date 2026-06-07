const fs = require("fs");
const path = require("path");

const AUDIO_DIR = path.join(__dirname, "..", "client", "public", "audio");
const FEED_PATH = path.join(__dirname, "..", "client", "public", "feed.xml");
const META_PATH = path.join(AUDIO_DIR, "briefing-meta.json");

const BASE_URL = "https://korea-economy-dashboard.vercel.app";

const DEFAULT_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>한국 경제 브리핑</title>
    <description>AI가 매일 생성하는 한국 경제 오디오 브리핑</description>
    <link>${BASE_URL}</link>
    <language>ko-KR</language>
    <itunes:author>matrixshin-ai</itunes:author>
    <itunes:image href="${BASE_URL}/og-image.png"/>
  </channel>
</rss>`;

function toRfc2822Kst(dateStr) {
  // dateStr: "YYYY-MM-DD" → KST 17:00 in RFC 2822
  const [year, month, day] = dateStr.split("-").map(Number);
  // KST 17:00 = UTC 08:00
  const d = new Date(Date.UTC(year, month - 1, day, 8, 0, 0));
  return d.toUTCString().replace("GMT", "+0900");
}

function buildItem(date, sizeBytes) {
  const pubDate = toRfc2822Kst(date);
  const url = `${BASE_URL}/audio/briefing-kr-${date}.mp3`;
  const guid = `korea-economy-briefing-${date}`;
  return [
    "    <item>",
    `      <title>한국 경제 브리핑 ${date}</title>`,
    "      <description>오늘의 한국 경제 주요 이슈를 정리한 오디오 브리핑입니다.</description>",
    `      <pubDate>${pubDate}</pubDate>`,
    `      <guid isPermaLink="false">${guid}</guid>`,
    `      <enclosure`,
    `        url="${url}"`,
    `        length="${sizeBytes}"`,
    `        type="audio/mpeg"/>`,
    "    </item>",
  ].join("\n");
}

function main() {
  if (!fs.existsSync(META_PATH)) {
    console.error("briefing-meta.json not found:", META_PATH);
    process.exit(1);
  }

  const meta = JSON.parse(fs.readFileSync(META_PATH, "utf8"));
  const { date, size_bytes: sizeBytes } = meta;

  if (!date) {
    console.error("briefing-meta.json has no date field");
    process.exit(1);
  }

  const guid = `korea-economy-briefing-${date}`;

  const feedXml = fs.existsSync(FEED_PATH)
    ? fs.readFileSync(FEED_PATH, "utf8")
    : DEFAULT_FEED;

  if (feedXml.includes(`<guid isPermaLink="false">${guid}</guid>`)) {
    console.log(`already exists, skip (${guid})`);
    return;
  }

  const item = buildItem(date, sizeBytes);
  // Insert before the first <item>, or before </channel> if no items yet
  const insertBefore = feedXml.includes("<item>") ? "<item>" : "</channel>";
  const updated = feedXml.replace(insertBefore, `${item}\n    ${insertBefore}`);

  fs.writeFileSync(FEED_PATH, updated, "utf8");
  console.log(`Added episode ${date} to feed.xml`);
}

main();
