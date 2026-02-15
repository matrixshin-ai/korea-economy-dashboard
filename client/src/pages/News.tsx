import { Sidebar } from "@/components/layout/Sidebar";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import { NewsItem } from "@/lib/mockData";
import { useLocation, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'top5', label: '핵심이슈 Top5' },
  { id: 'macro', label: '거시경제/재정' },
  { id: 'finance', label: '금융시장' },
  { id: 'industry', label: '산업/과학' },
  { id: 'real-estate', label: '부동산' },
  { id: 'global', label: '국제경제' },
  { id: 'others', label: '기타' },
];

interface BriefingData {
  top5: NewsItem[];
  sections: Record<string, NewsItem[]>;
}

export default function NewsPage() {
  const [match, params] = useRoute("/news/:category?");
  const category = params?.category || 'all';
  const [, setLocation] = useLocation();

  const { data: briefingData } = useQuery<BriefingData>({
    queryKey: ["/api/briefing"],
    queryFn: async () => {
      const res = await fetch("/api/briefing");
      return res.json();
    },
  });

  const categoryMap: Record<string, string> = {
    'macro': '거시경제·재정',
    'finance': '금융시장',
    'industry': '산업·과학',
    'real-estate': '부동산',
    'global': '국제경제',
    'others': '기타'
  };

  const getFilteredNews = (): NewsItem[] => {
    if (!briefingData) return [];
    
    if (category === 'top5') {
      return briefingData.top5 || [];
    }
    
    if (category === 'all') {
      const allNews: NewsItem[] = [...(briefingData.top5 || [])];
      Object.values(briefingData.sections || {}).forEach(items => {
        allNews.push(...items);
      });
      return allNews;
    }
    
    const sectionName = categoryMap[category];
    if (sectionName && briefingData.sections) {
      return briefingData.sections[sectionName] || [];
    }
    
    return [];
  };

  const filteredNews = getFilteredNews();

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-[1200px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-serif text-foreground mb-4">경제 뉴스</h1>
          
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setLocation(cat.id === 'all' ? '/news' : `/news/${cat.id}`)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
                  (category === cat.id || (category === undefined && cat.id === 'all'))
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <NewsFeed news={filteredNews} />
        </div>
      </main>
    </div>
  );
}
