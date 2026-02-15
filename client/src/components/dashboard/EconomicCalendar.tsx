import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Indicator {
  indicator: string;
  indicator_code: string;
  year: string;
  value: number;
  formatted_value: string;
  unit: string;
}

interface EconomicCalendarData {
  updated_at: string;
  source: string;
  countries: string[];
  indicators_by_country: Record<string, Indicator[]>;
}

const INDICATOR_ORDER = [
  "GDP",
  "GDP 성장률",
  "물가상승률",
  "실업률",
  "수출/GDP 비율",
  "정부부채/GDP",
];

export function EconomicCalendar() {
  const { data, isLoading } = useQuery<EconomicCalendarData>({
    queryKey: ["/api/economic-calendar"],
  });

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <Globe className="h-5 w-5 text-blue-600" />
            주요국 경제지표
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-slate-500 text-sm">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.countries || data.countries.length === 0) {
    return null;
  }

  const getValueTrend = (value: number, indicator: string) => {
    if (indicator.includes("성장률") || indicator === "GDP") {
      return value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
    }
    if (indicator.includes("물가") || indicator.includes("실업")) {
      return value > 3 ? "negative" : value < 2 ? "positive" : "neutral";
    }
    return "neutral";
  };

  const sortIndicators = (indicators: Indicator[]) => {
    return [...indicators].sort((a, b) => {
      const aIndex = INDICATOR_ORDER.indexOf(a.indicator);
      const bIndex = INDICATOR_ORDER.indexOf(b.indicator);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  };

  return (
    <Card className="bg-white border-slate-200 shadow-sm" data-testid="economic-calendar-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <Globe className="h-5 w-5 text-blue-600" />
            주요국 경제지표
          </CardTitle>
          <span className="text-xs text-slate-500">
            출처: {data.source} | 업데이트: {new Date(data.updated_at).toLocaleDateString("ko-KR")}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={data.countries[0]} className="w-full">
          <TabsList className="grid grid-cols-6 gap-1 bg-slate-100 mb-4">
            {data.countries.map((country) => (
              <TabsTrigger
                key={country}
                value={country}
                className="text-xs text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                data-testid={`tab-country-${country}`}
              >
                {country}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {data.countries.map((country) => (
            <TabsContent key={country} value={country} className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {sortIndicators(data.indicators_by_country[country] || []).map((ind, idx) => {
                  const trend = getValueTrend(ind.value, ind.indicator);
                  return (
                    <div
                      key={`${ind.indicator_code}-${idx}`}
                      className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                      data-testid={`indicator-${country}-${ind.indicator_code}`}
                    >
                      <div className="text-xs text-slate-500 mb-1">{ind.indicator}</div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          trend === "positive" ? "text-green-600" :
                          trend === "negative" ? "text-red-600" :
                          "text-slate-800"
                        }`}>
                          {ind.formatted_value}
                        </span>
                        <span className="text-xs text-slate-400">{ind.unit}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{ind.year}년</div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
