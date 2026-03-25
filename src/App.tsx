import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";

const ProspectSurvey = lazy(() => import("./pages/ProspectSurvey"));
const SurveyResults = lazy(() => import("./pages/SurveyResults"));
const Rapportage = lazy(() => import("./pages/Rapportage"));
const Afspraak = lazy(() => import("./pages/Afspraak"));
const NotFound = lazy(() => import("./pages/NotFound"));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Laden...</span>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/enquete/:id" element={<ProspectSurvey />} />
            <Route path="/resultaten" element={<SurveyResults />} />
            <Route path="/rapportage" element={<Rapportage />} />
            <Route path="/afspraak" element={<Afspraak />} />
            <Route path="/ghl-iframe" element={<GhlIframe />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
