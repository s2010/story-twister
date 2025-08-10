import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { PageShell } from "@/ui";
import Home from "./pages/Home";
import TeamSelect from "./pages/TeamSelect";
import StoryRoom from "./pages/StoryRoom";
import Leaderboard from "./pages/Leaderboard";
import StorySummary from "./pages/StorySummary";
import NotFound from "./pages/NotFound";

import {
  AdminLogin,
  AdminDashboard,
  AdminLiveView,
  AdminAnalysis,
} from "./pages/admin";
import AdminAuthWrapper from "./components/AdminAuthWrapper";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isStoryRoom = location.pathname.startsWith("/room/");

  return (
    <PageShell withGrassFooter={!isStoryRoom}>
      <Routes>
        <Route path="/" element={<TeamSelect />} />
        <Route path="/home" element={<Home />} />
        <Route path="/room/:teamId" element={<StoryRoom />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/story-summary/:teamId" element={<StorySummary />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminAuthWrapper>
              <AdminDashboard />
            </AdminAuthWrapper>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminAuthWrapper>
              <AdminDashboard />
            </AdminAuthWrapper>
          }
        />
        <Route
          path="/admin/live/:sessionId"
          element={
            <AdminAuthWrapper>
              <AdminLiveView />
            </AdminAuthWrapper>
          }
        />
        <Route
          path="/admin/analysis"
          element={
            <AdminAuthWrapper>
              <AdminAnalysis />
            </AdminAuthWrapper>
          }
        />
        <Route
          path="/admin/analysis/:sessionId"
          element={
            <AdminAuthWrapper>
              <AdminAnalysis />
            </AdminAuthWrapper>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageShell>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
