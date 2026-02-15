import { Sidebar } from "@/components/layout/Sidebar";
import { EconomicCalendar } from "@/components/dashboard/EconomicCalendar";

export default function IndicatorsPage() {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-serif text-foreground mb-2">주요국 경제지표</h1>
          <p className="text-muted-foreground">Major Countries Economic Indicators - World Bank 데이터 기반</p>
        </div>

        <EconomicCalendar />
      </main>
    </div>
  );
}
