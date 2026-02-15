import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Newspaper, 
  BookOpen, 
  FileText,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Globe,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";

const NEWS_SUB_SECTIONS = [
  { label: '오늘의 핵심이슈 Top5', href: '/news/top5' },
  { label: '거시경제/재정', href: '/news/macro' },
  { label: '금융시장', href: '/news/finance' },
  { label: '산업/과학기술', href: '/news/industry' },
  { label: '부동산', href: '/news/real-estate' },
  { label: '국제경제', href: '/news/global' },
  { label: '기타', href: '/news/others' },
];

const REPORT_SUB_SECTIONS = [
  { label: '오늘의 뉴스 종합', href: '/report' },
  { label: '기관 보고서', href: '/report/institutional' },
  { label: '민간 경제연구소', href: '/report/private-institutes' },
];

export function Sidebar() {
  const [location] = useLocation();
  const [newsExpanded, setNewsExpanded] = useState(true);
  const [reportExpanded, setReportExpanded] = useState(true);
  const [indicatorsExpanded, setIndicatorsExpanded] = useState(false);

  const isNewsActive = location === '/news' || location.startsWith('/news/');
  const isReportActive = location === '/report' || location.startsWith('/report/');
  const isIndicatorsActive = location === '/indicators';

  return (
    <div className="w-64 h-screen border-r border-border bg-card flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-border/50">
        <h1 className="font-serif font-bold text-xl text-primary tracking-tight">
          Korea <span className="text-foreground">Economy</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-medium">Economic News & Analysis</p>
        <div className="mt-2 text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded inline-block">
          Updates Daily at 07:00 KST
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <Link href="/" className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
          location === '/' 
            ? "bg-primary/10 text-primary shadow-sm" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}>
          <LayoutDashboard className={cn("w-4 h-4", location === '/' ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
          종합 대시보드
        </Link>

        <Link href="/market-tape" className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
          location === '/market-tape' 
            ? "bg-primary/10 text-primary shadow-sm" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}>
          <TrendingUp className={cn("w-4 h-4", location === '/market-tape' ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
          Market Tape
        </Link>

        <div>
          <button
            onClick={() => setNewsExpanded(!newsExpanded)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
              isNewsActive 
                ? "bg-primary/10 text-primary shadow-sm" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <Newspaper className={cn("w-4 h-4", isNewsActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              경제 뉴스
            </div>
            {newsExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {newsExpanded && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-3">
              <Link href="/news" className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                location === '/news'
                  ? "text-primary font-medium bg-primary/5" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <span className="w-1 h-1 rounded-full bg-current" />
                전체 뉴스
              </Link>
              {NEWS_SUB_SECTIONS.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    isActive 
                      ? "text-primary font-medium bg-primary/5" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}>
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setReportExpanded(!reportExpanded)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
              isReportActive 
                ? "bg-primary/10 text-primary shadow-sm" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <FileText className={cn("w-4 h-4", isReportActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              일일 보고서
            </div>
            {reportExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {reportExpanded && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-3">
              {REPORT_SUB_SECTIONS.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    isActive 
                      ? "text-primary font-medium bg-primary/5" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}>
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <Link href="/essay" className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
          location === '/essay' 
            ? "bg-primary/10 text-primary shadow-sm" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}>
          <BookOpen className={cn("w-4 h-4", location === '/essay' ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
          경제 에세이
        </Link>

        <div>
          <button
            onClick={() => setIndicatorsExpanded(!indicatorsExpanded)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group",
              "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className={cn("w-4 h-4", "text-muted-foreground group-hover:text-foreground")} />
              경제 지표
            </div>
            {indicatorsExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {indicatorsExpanded && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-3">
              <a 
                href="http://eiec.kdi.re.kr/bigdata/indicators.do?cat=%EA%B5%AD%EB%AF%BC%EA%B3%84%EC%A0%95"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                한국 경제 지표
              </a>
              <Link href="/indicators" className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                location === '/indicators'
                  ? "text-primary font-medium bg-primary/5" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                <Globe className="w-3.5 h-3.5" />
                주요국 경제지표
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <a 
          href="/api/download-project" 
          download="korea-economy-project.zip"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary"
          data-testid="button-download-project"
        >
          <Download className="w-4 h-4" />
          전체 프로젝트 다운로드
        </a>
        <a 
          href="/api/download-scoring-logic" 
          download="scoring_logic.zip"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
          data-testid="button-download-scoring"
        >
          <Download className="w-4 h-4" />
          뉴스 선정 로직 다운로드
        </a>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium">Logged in as</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">A</div>
            <span className="text-sm font-semibold">Administrator</span>
          </div>
        </div>
      </div>
    </div>
  );
}
