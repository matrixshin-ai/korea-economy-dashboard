import { useState } from 'react';
import { NewsItem } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Eye, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NewsFeedProps {
  news: NewsItem[];
  compact?: boolean;
}

export function NewsFeed({ news, compact = false }: NewsFeedProps) {
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const sortedNews = [...news].sort((a, b) => (Number(b.important) - Number(a.important)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold font-serif flex items-center gap-2">
          <span className="w-1 h-5 bg-primary rounded-full"/>
          주요 뉴스
        </h2>
        <Link href="/news" className="text-xs font-medium text-primary hover:underline flex items-center">
          더보기 <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>

      <div className="grid gap-4">
        {sortedNews.map((item) => (
          <NewsCard key={item.id} item={item} compact={compact} onClick={() => setSelectedArticle(item)} />
        ))}
      </div>

      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px]">
                {selectedArticle?.category}
              </Badge>
              <span className="text-xs text-muted-foreground">{selectedArticle?.date}</span>
              <span className="text-xs text-muted-foreground">| {selectedArticle?.source}</span>
            </div>
            <DialogTitle className="font-serif text-xl leading-tight">
              {selectedArticle?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
              {selectedArticle?.content ? (
                selectedArticle.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))
              ) : (
                <p>{selectedArticle?.summary}</p>
              )}
            </div>
          </ScrollArea>
          {selectedArticle?.url && (
            <div className="pt-4 border-t mt-4">
              <Button variant="outline" size="sm" asChild>
                <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  원문 보기
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewsCard({ item, compact, onClick }: { item: NewsItem; compact: boolean; onClick: () => void }) {
  const handleClick = () => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else {
      onClick();
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "group relative bg-card rounded-lg border border-border/50 p-4 transition-all hover:shadow-md hover:border-primary/20 block cursor-pointer",
        item.important && "bg-accent/10 border-accent/20"
      )}
      data-testid={`news-card-${item.id}`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn(
              "text-[10px] h-5 font-normal",
              item.category === 'Macro' && "border-blue-200 text-blue-700 bg-blue-50",
              item.category === 'Finance' && "border-emerald-200 text-emerald-700 bg-emerald-50",
              item.category === 'Industry' && "border-purple-200 text-purple-700 bg-purple-50",
              item.important && "border-red-200 text-red-700 bg-red-50 font-semibold"
            )}>
              {item.category}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center">
              <Clock className="w-3 h-3 mr-1" /> {item.date}
            </span>
          </div>
          
          <h3 className={cn(
            "font-serif font-bold text-foreground leading-snug group-hover:text-primary transition-colors",
            compact ? "text-sm" : "text-lg"
          )}>
            {item.title}
          </h3>
          
          {!compact && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {item.summary}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium text-muted-foreground/80">
              {item.source}
            </span>
            {item.views && (
              <span className="text-[10px] text-muted-foreground flex items-center bg-muted/50 px-1.5 py-0.5 rounded">
                <Eye className="w-3 h-3 mr-1" /> {item.views.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
