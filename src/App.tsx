import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";
import BottomBanner from "@/components/BottomBanner";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Registration from "./pages/Registration";
import WaitingApproval from "./pages/WaitingApproval";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import OrganizationMaster from "./pages/OrganizationMaster";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// const ApprovedGuard = ({ children }: { children: JSX.Element }) => {
//   const { user, loading, isApproved } = useAuth();
//   if (loading) return children;

//   if(user && window.location.pathname === "/auth") {
//     return <Navigate to="/" replace />;
//   }

//   if (!user?.profile?.first_name || !user?.profile?.phone) {
//     // Profile incomplete - redirect to registration
//     return <Navigate to="/registration" replace />;
//   }
//   if (user && !isApproved && user?.profile?.first_name && user?.profile?.phone) {
//     return <Navigate to="/waiting-approval" replace />;
//   }
//   return children;
// };

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="pb-16">
              <Routes>
                <Route path="/" element={<Index />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/registration" element={<Registration />} />
              <Route path="/waiting-approval" element={<WaitingApproval />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/organizations" element={<OrganizationMaster />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <BottomBanner />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
