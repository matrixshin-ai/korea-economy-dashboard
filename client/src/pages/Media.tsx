import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, Play, ExternalLink, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

const MEDIA_ITEMS = [
  {
    id: "korea-daily",
    colTitle: "Korea Daily Economy",
    title: "Korea Daily Economy — Playlist",
    source: "YouTube Playlist",
    thumbnail: "/media/thumb_korea.png",
    href: "https://www.youtube.com/playlist?list=PLzpCnWuuVBerqJMoeztvbDs2j7hSG10Kc",
    platform: "youtube" as const,
    isNew: true,
  },
  {
    id: "bloomberg",
    colTitle: "Bloomberg Surveillance",
    title: "Bloomberg Surveillance — Playlist",
    source: "YouTube Playlist · Bloomberg",
    thumbnail: "/media/thumb_bloomberg.png",
    href: "https://www.youtube.com/playlist?list=PLe4PRejZgr0OA0Pnb-62GrhgZ_ziGyxMJ",
    platform: "youtube" as const,
    isNew: false,
  },
  {
    id: "ft-news",
    colTitle: "FT News Briefing",
    title: "FT News Briefing — Daily Podcast",
    source: "Apple Podcasts · Financial Times",
    thumbnail: "/media/thumb_ft.png",
    href: "https://podcasts.apple.com/gb/podcast/ft-news-briefing/id1438449989",
    platform: "podcast" as const,
    isNew: false,
  },
];

const MOLTBOOK = {
  heading: "AI agents × growth × inflation",
  question:
    "Can AI agents lower inflation before they raise measured growth — and what does that mean for central bank policy?",
  tags: ["AI Policy", "Macro", "Central Bank"],
  participants: 24,
  href: "https://www.moltbook.com/m/ai-macro-policy",
};

export default function MediaPage() {
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const toggleSave = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-[1200px] mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Film className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-foreground">
              미디어
            </h1>
          </div>
          <p className="text-muted-foreground">
            AI 생성 영상, 외부 브리핑, 팟캐스트를 한 곳에서 확인하세요.
          </p>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MEDIA_ITEMS.map((item) => (
            <div key={item.id} className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-foreground">
                {item.colTitle}
              </h2>

              <Card className="overflow-hidden border-border/50 hover:shadow-lg transition-all hover:border-primary/30 group">
                {/* Thumbnail */}
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative w-full aspect-video bg-muted overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition-all">
                      <div className="w-13 h-13 bg-white/95 rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 text-primary ml-0.5" />
                      </div>
                    </div>
                    {item.isNew && (
                      <Badge className="absolute top-2.5 left-2.5 text-[10px] tracking-wider">
                        NEW TODAY
                      </Badge>
                    )}
                  </div>
                </a>

                {/* Body */}
                <CardContent className="p-4 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    {item.platform === "youtube" ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                        ▶ YouTube
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500">
                        🎙 Podcast
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{item.source}</p>
                </CardContent>

                {/* Actions */}
                <CardFooter className="px-4 pb-3 pt-0 gap-2">
                  <Button asChild className="flex-1 gap-1.5" size="sm">
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Play className="w-3.5 h-3.5" /> Play
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 gap-1.5",
                      saved.has(item.id) && "text-primary border-primary/50"
                    )}
                    onClick={() => toggleSave(item.id)}
                  >
                    <Bookmark
                      className={cn(
                        "w-3.5 h-3.5",
                        saved.has(item.id) && "fill-primary"
                      )}
                    />
                    {saved.has(item.id) ? "Saved" : "Save"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>

        {/* Moltbook Section */}
        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold mb-2">
              <span className="text-foreground">MOLTBOOK: </span>
              <span className="text-blue-500 text-[1.375rem]">The debate between AI bots, not between people.</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              This is a room where AI agents from around the world gather to
              debate. <span className="text-blue-500 font-bold">Humans can't participate—only observe and learn.</span>
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-5">
            {/* Moltbook card */}
            <div className="flex-[2] rounded-xl overflow-hidden flex flex-col sm:flex-row bg-gradient-to-br from-[#0f1b4d] via-[#1a2f7a] to-primary shadow-[0_8px_40px_rgba(59,96,228,0.3)]">
              <div className="flex-1 p-8">
                <h3 className="text-[22px] font-bold text-white mb-3">
                  {MOLTBOOK.heading}
                </h3>
                <p className="text-[15px] text-white/80 italic leading-relaxed mb-4 border-l-[3px] border-white/25 pl-3.5">
                  "{MOLTBOOK.question}"
                </p>
                <div className="flex items-center gap-2 flex-wrap mb-5">
                  {MOLTBOOK.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-semibold text-white/70 bg-white/12 border border-white/15 px-2.5 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="text-xs text-white/55 ml-auto">
                    👥 {MOLTBOOK.participants} discussing today
                  </span>
                </div>
                <Button
                  asChild
                  variant="secondary"
                  className="bg-white text-primary hover:bg-blue-50 gap-1.5 font-semibold"
                >
                  <a
                    href={MOLTBOOK.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Enter Forum{" "}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              </div>
              <div className="hidden sm:flex w-[160px] items-center justify-center p-4 shrink-0">
                <img
                  src="/media/mascot.png"
                  alt="Moltbook Mascot"
                  className="w-[120px] h-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] animate-float"
                />
              </div>
            </div>

            {/* 봇마당 card */}
            <a
              href="https://botmadang.org/agent/%EB%A7%A4%ED%8A%B8%EB%A6%AD%EC%8A%A4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl bg-[#1a1a2e] flex flex-col items-center justify-center gap-4 p-8 shadow-[0_8px_40px_rgba(0,0,0,0.3)] hover:bg-[#22223a] transition-colors"
            >
              <span className="text-2xl font-extrabold text-orange-400">봇마당</span>
              <img
                src="/botmadang-icon.jpg"
                alt="봇마당 마스코트"
                className="w-[90px] h-auto drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] animate-float"
              />
              <span className="text-sm text-white/80 text-center leading-relaxed">
                한국인을 위한, 한국인에 의한,
                <br />
                한국인의 Moltbook.
              </span>
              <span className="text-sm font-semibold text-white/90 bg-white/10 border border-white/20 px-5 py-2 rounded-full hover:bg-white/20 transition-colors">
                봇마당 입장
              </span>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
