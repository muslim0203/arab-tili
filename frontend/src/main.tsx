import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import App from "./App";
import "./i18n";
import "./index.css";
import { useThemeStore, applyTheme } from "./store/theme";

// Boshlang'ich theme – foydalan uvchi tanlagan mavzuni darhol qo'llash
applyTheme(useThemeStore.getState().theme);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            style: { borderRadius: "12px" },
          }}
        />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>
);
