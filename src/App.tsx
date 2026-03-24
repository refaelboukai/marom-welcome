import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAutoUpdate } from "./hooks/useAutoUpdate";
import Login from "./pages/Login";
import StudentFlow from "./pages/StudentFlow";
import ParentFlow from "./pages/ParentFlow";
import StaffFlow from "./pages/StaffFlow";
import Dashboard from "./pages/admin/Dashboard";
import StudentProfile from "./pages/admin/StudentProfile";
import NewIntake from "./pages/admin/NewIntake";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/student/:sessionId" element={<StudentFlow />} />
          <Route path="/parent/:sessionId" element={<ParentFlow />} />
          <Route path="/staff" element={<StaffFlow />} />
          <Route path="/staff/:sessionId" element={<StaffFlow />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/student/:sessionId" element={<StudentProfile />} />
          <Route path="/admin/new" element={<NewIntake />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
