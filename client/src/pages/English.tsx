import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, FileText, Play } from "lucide-react";
import { useState } from "react";

interface KeyHeadline {
  title: string;
  summary: string;
}

interface SummaryEn {
  date: string;
  generated_at: string;
  key_headlines: KeyHeadline[];
  sections: Record<string, string>;
}

interface BriefingData {
  date: string;
  summary_en?: SummaryEn;
  youtube_url?: string;
}

interface NarrationData {
  summary: string;
  date: string;
  lang: string;
}

const SECTION_ORDER = [
  "Hot Economy News",
  "Macro & Fiscal Policy",
  "Financial Markets",
  "Industry & Technology",
  "Real Estate",
  "International Economy",
  "Others",
];

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return null;
}

export default function EnglishPage() {
  const [narrationOpen, setNarrationOpen] = useState(false);

  const { data: briefing, isLoading } = useQuery<BriefingData>({
    queryKey: ["/api/briefing"],
    queryFn: async () => {
      const res = await fetch("/api/briefing");
      return res.json();
    },
  });

  const { data: narration, isLoading: narrationLoading } = useQuery<NarrationData>({
    queryKey: ["/api/briefing-summary", "EN"],
    queryFn: async () => {
      const res = await fetch("/api/briefing-summary?lang=EN&wait=false");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: narrationOpen,
  });

  const summaryEn = briefing?.summary_en;
  const youtubeUrl = briefing?.youtube_url || "";
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading briefing data...</div>
      </div>
    );
  }

  if (!summaryEn) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-8 text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">English summary is not available yet.</p>
            <p className="text-sm mt-2">It will be generated after the daily 15:30 KST update.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Top navigation */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <header className="mb-12 border-b-2 border-gray-900 pb-6">
          <h1 className="text-4xl font-serif font-bold text-gray-900 leading-tight">
            Korea Economy Daily Brief
          </h1>
          <p className="text-lg text-gray-500 mt-2 font-serif italic">
            {formatDate(summaryEn.date)}
          </p>
        </header>

        {/* Key Headlines */}
        <section className="mb-12">
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">
            Key Headlines
          </h2>
          <ol className="space-y-4">
            {(summaryEn.key_headlines || []).map((headline, idx) => (
              <li key={idx} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                    {headline.title}
                  </h3>
                  <p className="text-gray-600 mt-1 leading-relaxed">
                    {headline.summary}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Section summaries */}
        {SECTION_ORDER.map((sectionName) => {
          const content = summaryEn.sections?.[sectionName];
          if (!content) return null;
          return (
            <section key={sectionName} className="mb-10">
              <h2 className="text-xl font-serif font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                {sectionName}
              </h2>
              <p className="text-gray-700 leading-relaxed text-[15px]">
                {content}
              </p>
            </section>
          );
        })}

        {/* Daily News Summary narration dialog */}
        <div className="mt-12 mb-8">
          <Dialog open={narrationOpen} onOpenChange={setNarrationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                Daily News Summary
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Daily News Summary (EN)</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {narrationLoading ? (
                  <div className="text-center py-8 text-gray-400">Loading narration...</div>
                ) : narration?.summary ? (
                  <div className="prose prose-gray max-w-none whitespace-pre-line text-[15px] leading-relaxed">
                    {narration.summary}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    English narration is not available yet.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* YouTube Video Brief */}
        <section className="mb-12">
          <h2 className="text-xl font-serif font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Today's Video Brief
          </h2>
          {embedUrl ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
              <iframe
                src={embedUrl}
                title="Today's Video Brief"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="py-12 text-center">
                <Play className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Coming soon</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-6 mt-12 text-center text-xs text-gray-400">
          <p>Generated by AI analysis &middot; Data sourced from Korean economic news outlets</p>
          {summaryEn.generated_at && (
            <p className="mt-1">
              Last updated: {new Date(summaryEn.generated_at).toLocaleString("en-US", { timeZone: "Asia/Seoul" })} KST
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
