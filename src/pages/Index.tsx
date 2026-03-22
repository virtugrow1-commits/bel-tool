import BelTool from "./BelTool";

const SURVEY_DOMAIN = "enquete.cliqmakers.nl";

const Index = () => {
  const isSurveyDomain = window.location.hostname === SURVEY_DOMAIN;

  if (isSurveyDomain) {
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
