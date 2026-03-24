import { lazy, Suspense } from "react";
import BelTool from "./BelTool";

const Afspraak = lazy(() => import("./Afspraak"));

const SURVEY_DOMAIN = "enquete.cliqmakers.nl";
const BOOKING_DOMAIN = "adviesgesprekken.cliqmakers.nl";

const Index = () => {
  const hostname = window.location.hostname;

  if (hostname === BOOKING_DOMAIN) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }>
        <Afspraak />
      </Suspense>
    );
  }

  if (hostname === SURVEY_DOMAIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-foreground">CliqMakers Enquête</h1>
          <p className="text-muted-foreground">Gebruik de link die je via e-mail of WhatsApp hebt ontvangen om de enquête te openen.</p>
        </div>
      </div>
    );
  }

  return <BelTool />;
};

export default Index;
