import { Sidebar } from "@/components/layout/Sidebar";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip, Area, AreaChart } from 'recharts';
import { ArrowUp, ArrowDown, Minus, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Indicator {
  id: string;
  name: string;
  value: string;
  change: number;
  trend: { value: number }[];
}

interface IndicatorsResponse {
  updated_at: string;
  indicators: Indicator[];
}

const INDICATOR_GROUPS = {
  "주식시장": ["kospi", "kosdaq", "sp500", "nasdaq", "dow"],
  "채권/금리": ["kr_base_rate", "kr_3y", "kr_10y", "us_10y", "us_30y", "us_rate"],
  "환율": ["krw_usd", "jpy_usd", "cny_usd", "dxy"],
  "원자재": ["wti", "gold"]
};

export default function MarketTapePage() {
  const { data: indicatorsData, isLoading } = useQuery<IndicatorsResponse>({
    queryKey: ["/api/indicators"],
    queryFn: async () => {
      const res = await fetch("/api/indicators");
      return res.json();
    },
  });

  const indicatorList = indicatorsData?.indicators || [];

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-[1600px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-foreground">Market Tape</h1>
          </div>
          <p className="text-muted-foreground">실시간 시장 지표 및 차트 (D-1 전일 종가 기준)</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(INDICATOR_GROUPS).map(([groupName, ids]) => {
              const groupIndicators = ids
                .map(id => indicatorList.find(i => i.id === id))
                .filter((i): i is Indicator => i !== undefined);

              if (groupIndicators.length === 0) return null;

              return (
                <div key={groupName}>
                  <h2 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">{groupName}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupIndicators.map((indicator) => (
                      <IndicatorChartCard key={indicator.id} indicator={indicator} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function IndicatorChartCard({ indicator }: { indicator: Indicator }) {
  const isPositive = indicator.change > 0;
  const isNegative = indicator.change < 0;

  const chartColor = isNegative 
    ? "hsl(var(--chart-1))" 
    : isPositive 
    ? "hsl(var(--chart-2))" 
    : "hsl(var(--muted-foreground))";

  return (
    <Card className="border-border/60 hover:border-primary/30 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground">{indicator.name}</CardTitle>
          <div className={cn("flex items-center text-sm font-medium px-2 py-0.5 rounded-full bg-muted", 
            isPositive ? "text-[hsl(var(--chart-2))]" : 
            isNegative ? "text-[hsl(var(--chart-1))]" : 
            "text-muted-foreground"
          )}>
            {isPositive && <ArrowUp className="w-3 h-3 mr-0.5" />}
            {isNegative && <ArrowDown className="w-3 h-3 mr-0.5" />}
            {!isPositive && !isNegative && <Minus className="w-3 h-3 mr-0.5" />}
            {indicator.change > 0 ? '+' : ''}{indicator.change}%
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight text-foreground">{indicator.value}</div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={indicator.trend}>
              <defs>
                <linearGradient id={`gradient-${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#gradient-${indicator.id})`}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                width={50} 
                tick={{fontSize: 10}} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [value.toLocaleString(), indicator.name]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>6개월 전</span>
          <span>현재</span>
        </div>
      </CardContent>
    </Card>
  );
}
