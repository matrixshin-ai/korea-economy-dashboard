import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import NewsPage from "@/pages/News";
import EssayPage from "@/pages/Essay";
import IndicatorsPage from "@/pages/Indicators";
import MarketTapePage from "@/pages/MarketTape";
import ReportPage from "@/pages/Report";
import InstitutionalReportsPage from "@/pages/InstitutionalReports";
import PrivateInstitutesPage from "@/pages/PrivateInstitutes";
import Docs from "@/pages/Docs";
import AdminKeywordsPage from "@/pages/AdminKeywords";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/market-tape" component={MarketTapePage} />
      <Route path="/indicators" component={IndicatorsPage} />
      <Route path="/news" component={NewsPage} />
      <Route path="/news/:category" component={NewsPage} />
      <Route path="/report" component={ReportPage} />
      <Route path="/report/institutional" component={InstitutionalReportsPage} />
      <Route path="/report/private-institutes" component={PrivateInstitutesPage} />
      <Route path="/essay" component={EssayPage} />
      <Route path="/docs" component={Docs} />
      <Route path="/admin/keywords" component={AdminKeywordsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
