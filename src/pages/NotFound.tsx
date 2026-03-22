import { useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-muted-foreground">
          Pagina <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{location.pathname}</code> niet gevonden
        </p>
        <a href="/" className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors inline-block">
          Terug naar Bel-Tool
        </a>
      </div>
    </div>
  );
};

export default NotFound;
