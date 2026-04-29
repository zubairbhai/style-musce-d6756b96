import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import Navbar from "@/components/Navbar";
import AuthGate from "@/components/AuthGate";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StyleQuiz from "./pages/StyleQuiz";
import Lookbook from "./pages/Lookbook";
import TrendExplorer from "./pages/TrendExplorer";
import OutfitAnalyzer from "./pages/OutfitAnalyzer";
import Wardrobe from "./pages/Wardrobe";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Inner layout — renders Navbar only for authenticated routes (not /auth).
 */
const AppLayout = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";

  return (
    <>
      {/* Hide navbar on the auth page for a clean full-screen login experience */}
      {!isAuthPage && <Navbar />}

      <Routes>
        {/* ── Public route: Auth page (login/signup) ── */}
        <Route path="/auth" element={<Auth />} />

        {/* ── Protected routes: everything else requires authentication ── */}
        <Route
          path="/"
          element={
            <AuthGate>
              <Index />
            </AuthGate>
          }
        />
        <Route
          path="/quiz"
          element={
            <AuthGate>
              <StyleQuiz />
            </AuthGate>
          }
        />
        <Route
          path="/lookbook"
          element={
            <AuthGate>
              <Lookbook />
            </AuthGate>
          }
        />
        <Route
          path="/trends"
          element={
            <AuthGate>
              <TrendExplorer />
            </AuthGate>
          }
        />
        <Route
          path="/analyzer"
          element={
            <AuthGate>
              <OutfitAnalyzer />
            </AuthGate>
          }
        />
        <Route
          path="/wardrobe"
          element={
            <AuthGate>
              <Wardrobe />
            </AuthGate>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthGate>
              <Profile />
            </AuthGate>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
