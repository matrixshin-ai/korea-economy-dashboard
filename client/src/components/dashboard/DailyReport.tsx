import { Play, FileText, Square, Repeat, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface SummaryData {
  summary: string;
  date: string;
  generated_at: string;
  lang: 'KR' | 'EN';
}

export function DailyReport() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [lang, setLang] = useState<'KR' | 'EN'>('KR');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const loopingRef = useRef(false);

  const { data: audioMeta } = useQuery<{ date: string; generated_at: string } | null>({
    queryKey: ['/audio/briefing-meta.json'],
    queryFn: async () => {
      const res = await fetch('/audio/briefing-meta.json');
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const todayKST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const audioAvailable = lang === 'KR' && audioMeta?.date === todayKST;

  const { data: summaryData, isLoading, refetch } = useQuery<SummaryData>({
    queryKey: ['/api/briefing-summary', lang],
    queryFn: async () => {
      const res = await fetch(`/api/briefing-summary?lang=${lang}`);
      return res.json();
    },
  });

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
    if (!summaryData?.summary) return;
    
    const utterance = new SpeechSynthesisUtterance(summaryData.summary);
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
    setLang(lang === 'KR' ? 'EN' : 'KR');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return lang === 'KR'
      ? `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
      : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <Card className="h-full border-border/60 shadow-sm overflow-hidden flex flex-col">
        <CardContent className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {lang === 'KR' ? 'AI가 뉴스를 분석하여 요약 중입니다...' : 'AI is analyzing and summarizing the news...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border/60 shadow-sm overflow-hidden flex flex-col">
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
            {!audioAvailable && (
              <>
                <Button
                  size="sm"
                  className={isPlaying ? "bg-red-500 hover:bg-red-600 text-white h-8 w-8 p-0" : "h-8 w-8 p-0"}
                  onClick={handlePlay}
                  data-testid="button-audio-play"
                  disabled={!summaryData?.summary}
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
              </>
            )}
          </div>
        </div>
        {audioAvailable && (
          <audio
            key={audioMeta?.date}
            controls
            preload="metadata"
            className="w-full mt-3"
            src="/audio/briefing-kr.mp3"
          />
        )}
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-y-auto bg-white/50">
        <div className="p-5 prose prose-sm max-w-none text-foreground">
          <h1 className="text-xl font-bold mb-4 border-b pb-2 font-serif text-primary">
            {lang === 'KR' 
              ? `${formatDate(summaryData?.date || '')} 한국 경제 뉴스 브리핑`
              : `Korea Economic News Briefing - ${formatDate(summaryData?.date || '')}`}
          </h1>

          <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
            {summaryData?.summary || (lang === 'KR' ? '요약을 불러오는 중...' : 'Loading summary...')}
          </div>
        </div>
      </CardContent>
      
      <div className="p-3 border-t bg-muted/20 text-xs text-center text-muted-foreground">
        {lang === 'KR' 
          ? `Gemini AI 분석 • 생성일: ${summaryData?.generated_at ? new Date(summaryData.generated_at).toLocaleString('ko-KR') : ''} • 매일 07:00 자동 업데이트`
          : `Gemini AI Analysis • Generated: ${summaryData?.generated_at ? new Date(summaryData.generated_at).toLocaleString('en-US') : ''} • Auto-updates daily at 07:00 AM`}
      </div>
    </Card>
  );
}
