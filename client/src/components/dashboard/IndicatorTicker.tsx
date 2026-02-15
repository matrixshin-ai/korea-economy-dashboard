import { Indicator } from '@/lib/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { ArrowUp, ArrowDown, Minus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

interface IndicatorTickerProps {
  indicators: Indicator[];
}

const MAIN_INDICATOR_IDS = ['kospi', 'sp500', 'kr_10y', 'us_10y', 'krw_usd'];

export function IndicatorTicker({ indicators }: IndicatorTickerProps) {
  const mainIndicators = indicators.filter(i => MAIN_INDICATOR_IDS.includes(i.id));
  
  const orderedIndicators = MAIN_INDICATOR_IDS
    .map(id => mainIndicators.find(i => i.id === id))
    .filter((i): i is Indicator => i !== undefined);

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-foreground">Market Tape</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">D-1 (전일 종가)</span>
          <Link href="/market-tape">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 hover:text-primary" data-testid="market-tape-more">
              더보기 <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {orderedIndicators.map((item) => (
          <IndicatorCard key={item.id} indicator={item} />
        ))}
      </div>
    </div>
  );
}

function IndicatorCard({ indicator }: { indicator: Indicator }) {
  const isPositive = indicator.change > 0;
  const isNegative = indicator.change < 0;
  const isNeutral = indicator.change === 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-all duration-200 border-border/60 hover:border-primary/50 group bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-[100px]">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors line-clamp-1">{indicator.name}</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold tracking-tight text-foreground">{indicator.value}</span>
              </div>

              <div className={cn("flex items-center text-xs font-medium", 
                isPositive ? "text-[hsl(var(--chart-2))]" : 
                isNegative ? "text-[hsl(var(--chart-1))]" : 
                "text-muted-foreground"
              )}>
                {isPositive && <ArrowUp className="w-3 h-3 mr-0.5" />}
                {isNegative && <ArrowDown className="w-3 h-3 mr-0.5" />}
                {isNeutral && <Minus className="w-3 h-3 mr-0.5" />}
                {Math.abs(indicator.change)}%
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            {indicator.name} 
            <span className={cn("text-sm font-medium px-2 py-0.5 rounded-full bg-muted", 
               isPositive ? "text-[hsl(var(--chart-2))]" : isNegative ? "text-[hsl(var(--chart-1))]" : "text-muted-foreground"
            )}>
              {indicator.change > 0 ? '+' : ''}{indicator.change}%
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={indicator.trend}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={isNegative ? "hsl(var(--chart-1))" : isPositive ? "hsl(var(--chart-2))" : "hsl(var(--muted-foreground))"} 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 6 }} 
                />
                <YAxis domain={['auto', 'auto']} width={60} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between text-sm text-muted-foreground px-2">
            <span>6 Months Ago</span>
            <span>Today</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
