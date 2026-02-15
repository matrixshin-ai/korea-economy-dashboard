import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Repeat, FileText, Calendar, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface SummaryData {
  summary: string;
  date: string;
  generated_at: string;
  lang: 'KR' | 'EN';
}

export default function ReportPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [lang, setLang] = useState<'KR' | 'EN'>('KR');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const loopingRef = useRef(false);

  const { data: summaryData, isLoading, refetch } = useQuery<SummaryData>({
    queryKey: ['/api/briefing-summary', lang],
    queryFn: async () => {
      const res = await fetch(`/api/briefing-summary?lang=${lang}`);
      return res.json();
    },
  });

  const currentContent = summaryData?.summary || '';

  useEffect(() => {
    loopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
    refetch();
  }, [lang]);

  const playAudio = () => {
    if (!currentContent) return;
    
    const utterance = new SpeechSynthesisUtterance(currentContent);
    utterance.lang = lang === 'KR' ? 'ko-KR' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      if (loopingRef.current) {
        setTimeout(() => playAudio(), 500);
      } else {
        setIsPlaying(false);
      }
    };
    
    utterance.onerror = () => {
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => {
    if (!window.speechSynthesis) {
      alert(lang === 'KR' ? '이 브라우저에서는 음성 재생이 지원되지 않습니다.' : 'Speech synthesis is not supported in this browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      playAudio();
      setIsPlaying(true);
    }
  };

  const handleLangChange = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
    setLang(lang === 'KR' ? 'EN' : 'KR');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return lang === 'KR'
      ? `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
      : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const today = new Date().toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-[1000px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{today}</span>
          </div>
          <h1 className="text-3xl font-bold font-serif text-foreground mb-2">
            한국 경제 심층 일일 브리핑
          </h1>
          <p className="text-muted-foreground">Korea Economy Daily In-Depth Briefing</p>
        </div>

        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {lang === 'KR' ? '오늘의 뉴스 종합' : "Today's News Summary"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs gap-1.5"
                  onClick={handleLangChange}
                  data-testid="button-lang-toggle"
                >
                  {lang === 'KR' ? 'English' : '한국어'}
                </Button>
                <Button 
                  size="sm" 
                  className={isPlaying ? "bg-red-500 hover:bg-red-600 text-white h-8 w-8 p-0" : "h-8 w-8 p-0"}
                  onClick={handlePlay}
                  data-testid="button-audio-play"
                  disabled={isLoading || !currentContent}
                >
                  {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button 
                  size="sm" 
                  variant={isLooping ? "default" : "outline"}
                  className={isLooping ? "h-8 w-8 p-0" : "h-8 w-8 p-0"}
                  onClick={() => setIsLooping(!isLooping)}
                  data-testid="button-audio-loop"
                  title={lang === 'KR' ? '반복 재생' : 'Loop'}
                >
                  <Repeat className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => refetch()}
                  data-testid="button-refresh"
                  title={lang === 'KR' ? '새로고침' : 'Refresh'}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 bg-white/50">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : currentContent ? (
              <div className="p-8 prose prose-lg max-w-none text-foreground prose-headings:font-serif prose-headings:text-primary prose-strong:text-foreground">
                {currentContent.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mb-6 border-b pb-3">{line.replace('# ', '')}</h1>;
                  if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold mt-6 mb-3 text-slate-800">{line.replace('### ', '')}</h3>;
                  if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-8 mb-4 text-primary">{line.replace('## ', '')}</h2>;
                  if (line.trim() === '') return <br key={i} />;
                  const parts = line.split('**');
                  return (
                    <p key={i} className="mb-3 leading-relaxed text-slate-700 text-base">
                      {parts.map((part, index) => 
                        index % 2 === 1 
                          ? <strong key={index} className="font-bold text-slate-900 bg-yellow-50 px-1 rounded-sm">{part}</strong> 
                          : part
                      )}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                {lang === 'KR' ? '오늘의 브리핑을 불러오는 중입니다...' : 'Loading today\'s briefing...'}
              </div>
            )}
          </CardContent>
          
          <div className="p-4 border-t bg-muted/20 text-xs text-center text-muted-foreground">
            {summaryData?.date 
              ? (lang === 'KR' 
                  ? `${formatDate(summaryData.date)} 브리핑 • AI 분석에 의해 생성됨` 
                  : `${formatDate(summaryData.date)} Briefing • Generated by AI Analysis`)
              : (lang === 'KR' ? 'AI 분석에 의해 생성됨 • 오늘 07:00 업데이트' : 'Generated by AI Analysis • Updated today at 07:00 AM')
            }
          </div>
        </Card>
      </main>
    </div>
  );
}
