import { Sidebar } from "@/components/layout/Sidebar";
import { IndicatorTicker } from "@/components/dashboard/IndicatorTicker";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import { DailyReport } from "@/components/dashboard/DailyReport";
import { NewsItem, Indicator } from "@/lib/mockData";
import type { Essay } from "@shared/schema";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, BarChart3, FileText, ChevronRight, ChevronDown, Newspaper, BookOpen, Building2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface UpdateStatus {
  isUpdating: boolean;
  isStale: boolean;
  staleReason: string;
  ageHours: number;
  lastError: string | null;
}

export default function Home() {
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);

  const { data: updateStatus } = useQuery<UpdateStatus>({
    queryKey: ["/api/update-status"],
    queryFn: async () => {
      const res = await fetch("/api/update-status");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const isCurrentlyUpdating = updateStatus?.isUpdating ?? false;

  const { data: newsData } = useQuery<Record<string, NewsItem[]>>({
    queryKey: ["/api/news"],
    queryFn: async () => {
      const res = await fetch("/api/news");
      return res.json();
    },
    refetchInterval: isCurrentlyUpdating ? 10000 : false,
  });

  interface IndicatorsResponse {
    updated_at: string;
    indicators: Indicator[];
  }

  const { data: indicatorsData } = useQuery<IndicatorsResponse>({
    queryKey: ["/api/indicators"],
    queryFn: async () => {
      const res = await fetch("/api/indicators");
      return res.json();
    },
  });

  const indicators = indicatorsData?.indicators || [];

  interface KoreaStat {
    label: string;
    value: string;
    unit: string;
    change: string;
    year?: string;
  }

  interface KoreaStatsResponse {
    stats: KoreaStat[];
    source: string;
    updated_at?: string;
  }

  const { data: koreaStatsData } = useQuery<KoreaStatsResponse>({
    queryKey: ["/api/korea-stats"],
    queryFn: async () => {
      const res = await fetch("/api/korea-stats");
      return res.json();
    },
  });

  const koreaStats = koreaStatsData?.stats || [];

  const { data: essays } = useQuery<Essay[]>({
    queryKey: ["/api/essays"],
    queryFn: async () => {
      const res = await fetch("/api/essays");
      return res.json();
    },
  });

  const recentEssays = (essays || []).slice(0, 3);

  const newsCategories = ['Macro', 'Finance', 'Industry', 'RealEstate', 'International', 'Others'];
  
  const categoryTitles: Record<string, string> = {
    'Macro': '거시경제/재정',
    'Finance': '금융시장',
    'Industry': '산업/과학기술',
    'RealEstate': '부동산',
    'International': '국제경제',
    'Others': '기타',
  };

  const categoryLinks: Record<string, string> = {
    'Macro': '/news/macro',
    'Finance': '/news/finance',
    'Industry': '/news/industry',
    'RealEstate': '/news/real-estate',
    'International': '/news/global',
    'Others': '/news/others',
  };

  // Get top 5 news by importance/score across all categories
  const allNews = Object.values(newsData || {}).flat();
  const top5News = allNews
    .filter((news: NewsItem) => news.important || news.score)
    .sort((a: NewsItem, b: NewsItem) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-[1600px] mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-serif text-foreground mb-2">경제 종합 대시보드</h1>
          <p className="text-muted-foreground">Korea Economic News Dashboard</p>
        </div>

        {isCurrentlyUpdating && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3 text-blue-700">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">뉴스 데이터를 업데이트하고 있습니다... (Updating news data...)</span>
          </div>
        )}

        {/* Indicators Section - Grouped */}
        <IndicatorTicker indicators={indicators} />

        <div className="mt-8">
          
          {/* Economic News Title Box */}
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-slate-800 to-slate-700 text-white border-none shadow-lg">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-lg">
                  <Newspaper className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-serif">경제 뉴스</h2>
                  <p className="text-white/70 text-sm">Economic News - 주요 경제 분야별 최신 뉴스</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content: News Sections */}
          <div className="space-y-10">

            {/* Top 5 News Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h2 className="text-lg font-bold font-serif flex items-center gap-2 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  오늘의 핵심이슈 Top5
                </h2>
                <Link href="/news/top5">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                    더보기 <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="grid gap-3">
                {top5News.length > 0 ? top5News.map((news, idx) => (
                  <a 
                    key={news.id} 
                    href={news.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between py-2 hover:bg-muted/30 px-2 rounded-md transition-colors cursor-pointer border-b border-border/40 last:border-0"
                    data-testid={`top5-news-${idx}`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                      <div className="flex-1">
                        <h3 className="text-base font-medium group-hover:text-primary transition-colors line-clamp-1">
                          {news.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{news.summary}</p>
                      </div>
                    </div>
                    <div className="ml-4 text-xs text-muted-foreground whitespace-nowrap pt-1">
                      {news.source} • {news.date?.slice(5)}
                    </div>
                  </a>
                )) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">핵심이슈 데이터 로딩 중...</div>
                )}
              </div>
            </div>
            
            {newsCategories.map((cat) => {
              const displayCount = cat === 'Macro' ? 5 : 3;
              const categoryNews = (newsData?.[cat] || []).slice(0, displayCount);
              return (
                <div key={cat} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h2 className="text-lg font-bold font-serif flex items-center gap-2 text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {categoryTitles[cat]}
                    </h2>
                    <Link href={categoryLinks[cat]}>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                        더보기 <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  <div className="grid gap-3">
                    {categoryNews.map(news => (
                       <a 
                         key={news.id} 
                         href={news.url} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="group flex items-start justify-between py-2 hover:bg-muted/30 px-2 rounded-md transition-colors cursor-pointer border-b border-border/40 last:border-0"
                         data-testid={`news-link-${news.id}`}
                       >
                         <div className="flex-1">
                           <h3 className="text-base font-medium group-hover:text-primary transition-colors line-clamp-1">
                             {news.important && <span className="text-red-500 font-bold mr-2 text-xs align-middle inline-block px-1.5 py-0.5 bg-red-50 rounded-sm">HOT</span>}
                             {news.title}
                           </h3>
                           <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{news.summary}</p>
                         </div>
                         <div className="ml-4 text-xs text-muted-foreground whitespace-nowrap pt-1">
                            {news.source} • {news.date.slice(5)}
                         </div>
                       </a>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Daily Report Title Box - Collapsible */}
            <div className="mt-12 mb-4">
              <Card 
                className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white border-none shadow-lg cursor-pointer hover:from-indigo-600 hover:to-indigo-500 transition-all"
                onClick={() => setIsDailyReportOpen(!isDailyReportOpen)}
                data-testid="daily-report-toggle"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-lg">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold font-serif">일일 보고서</h2>
                    <p className="text-white/70 text-sm">Daily Report - 오늘의 경제 브리핑</p>
                  </div>
                  <div className="p-2">
                    <ChevronDown className={`w-6 h-6 transition-transform duration-200 ${isDailyReportOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Report Subsections - Collapsible */}
            <div className={`grid gap-4 overflow-hidden transition-all duration-300 ${isDailyReportOpen ? 'max-h-[1000px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
              {/* 오늘의 뉴스 종합 */}
              <Dialog>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:border-indigo-300 transition-colors hover:shadow-md border border-indigo-200 bg-indigo-50/50">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground mb-0.5">오늘의 뉴스 종합</h3>
                        <p className="text-muted-foreground text-xs">Daily Briefing - 주요 경제 뉴스 요약</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
                  <DailyReport />
                </DialogContent>
              </Dialog>

              {/* 기관 보고서 */}
              <Link href="/report/institutional">
                <Card className="cursor-pointer hover:border-indigo-300 transition-colors hover:shadow-md border border-indigo-200 bg-indigo-50/50">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-foreground mb-0.5">기관 보고서</h3>
                      <p className="text-muted-foreground text-xs">Institutional Reports - 주요 기관 발표 자료</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>

              {/* 민간 경제연구소 */}
              <Link href="/report/private-institutes">
                <Card className="cursor-pointer hover:border-indigo-300 transition-colors hover:shadow-md border border-indigo-200 bg-indigo-50/50">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-foreground mb-0.5">민간 경제연구소</h3>
                      <p className="text-muted-foreground text-xs">Private Research Institutes - 민간 경제연구기관</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Economic Essay Title Box */}
            <div className="mt-12 mb-8">
              <Card className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white border-none shadow-lg">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-lg">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-serif">경제 에세이</h2>
                    <p className="text-white/70 text-sm">Economic Essays - 심층 분석 및 전망</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Essay List - 3 items */}
            <Card className="border border-emerald-200 bg-emerald-50/30">
              <CardContent className="p-4">
                {recentEssays.length > 0 ? (
                  <div className="space-y-2">
                    {recentEssays.map((essay) => (
                      <Link key={essay.id} href="/essay">
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-emerald-100/50 transition-colors cursor-pointer border-b border-emerald-100 last:border-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {essay.publishedAt ? new Date(essay.publishedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''}
                          </span>
                          <span className="flex-1 text-sm font-medium text-foreground line-clamp-1">{essay.title}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    아직 등록된 에세이가 없습니다
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-emerald-200">
                  <Link href="/essay">
                    <Button variant="outline" className="w-full text-emerald-700 border-emerald-300 hover:bg-emerald-100">
                      더보기 <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>


        {/* Economic Indicators - Collapsible Section (at the very bottom) */}
        <div className="mt-12 mb-4">
          <Card 
            className="bg-gradient-to-r from-amber-600 to-amber-500 text-white border-none shadow-lg cursor-pointer hover:from-amber-500 hover:to-amber-400 transition-all"
            onClick={() => setIsIndicatorsOpen(!isIndicatorsOpen)}
            data-testid="indicators-toggle"
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold font-serif">경제 지표</h2>
                <p className="text-white/70 text-sm">Economic Indicators - 주요 경제 통계</p>
              </div>
              <div className="p-2">
                <ChevronDown className={`w-6 h-6 transition-transform duration-200 ${isIndicatorsOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Indicators Subsections - Collapsible */}
        <div className={`grid gap-4 overflow-hidden transition-all duration-300 ${isIndicatorsOpen ? 'max-h-[500px] opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
          {/* 한국 경제 지표 */}
          <a href="http://eiec.kdi.re.kr/bigdata/indicators.do?cat=%EA%B5%AD%EB%AF%BC%EA%B3%84%EC%A0%95" target="_blank" rel="noopener noreferrer">
            <Card className="cursor-pointer hover:border-amber-300 transition-colors hover:shadow-md border border-amber-200 bg-amber-50/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground mb-0.5">한국 경제 지표</h3>
                  <p className="text-muted-foreground text-xs">KDI 경제정보센터 - 국민계정 데이터</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </a>

          {/* 주요국 경제지표 */}
          <Link href="/indicators">
            <Card className="cursor-pointer hover:border-amber-300 transition-colors hover:shadow-md border border-amber-200 bg-amber-50/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground mb-0.5">주요국 경제지표</h3>
                  <p className="text-muted-foreground text-xs">Global Economic Indicators - 실시간 시장 데이터</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
