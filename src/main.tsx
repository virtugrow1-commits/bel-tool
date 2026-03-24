import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Prevent blank screens from unhandled GHL/Voys network errors
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || String(event.reason || '');
  const isNetworkError = (
    msg.includes('connection') ||
    msg.includes('reset') ||
    msg.includes('SendRequest') ||
    msg.includes('client error') ||
    msg.includes('network') ||
    msg.includes('CLIQ') ||
    msg.includes('GHL') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503')
  );
  if (isNetworkError) {
    console.warn('[BelTool] Network error (suppressed):', msg);
    event.preventDefault(); // prevent blank screen
  }
});

createRoot(document.getElementById("root")!).render(<App />);
