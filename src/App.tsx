import { QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "./components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import FlashcardsPage from "./pages/FlashcardsPage";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FlashcardsPage />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
