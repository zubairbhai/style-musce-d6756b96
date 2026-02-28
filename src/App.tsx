import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import StyleQuiz from "./pages/StyleQuiz";
import AIStylistChat from "./pages/AIStylistChat";
import OutfitGenerator from "./pages/OutfitGenerator";
import Lookbook from "./pages/Lookbook";
import TrendExplorer from "./pages/TrendExplorer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/quiz" element={<StyleQuiz />} />
          <Route path="/chat" element={<AIStylistChat />} />
          <Route path="/generator" element={<OutfitGenerator />} />
          <Route path="/lookbook" element={<Lookbook />} />
          <Route path="/trends" element={<TrendExplorer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
