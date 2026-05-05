import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./layouts/AdminLayout";
import CourierLayout from "./layouts/CourierLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import ShipmentsPage from "./pages/admin/ShipmentsPage";
import CreateShipmentPage from "./pages/admin/CreateShipmentPage";
import ShipmentDetailsPage from "./pages/admin/ShipmentDetailsPage";
import CouriersPage from "./pages/admin/CouriersPage";
import SellersPage from "./pages/admin/SellersPage";
import UsersPage from "./pages/admin/UsersPage";
import PaymentsPage from "./pages/admin/PaymentsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import SettingsPage from "./pages/admin/SettingsPage";
import CourierHomePage from "./pages/courier/CourierHomePage";
import CourierShipmentsPage from "./pages/courier/CourierShipmentsPage";
import CourierShipmentDetailPage from "./pages/courier/CourierShipmentDetailPage";
import CourierCODPage from "./pages/courier/CourierCODPage";
import CourierProfilePage from "./pages/courier/CourierProfilePage";
import AdminCourierProfilePage from "./pages/admin/CourierProfilePage";
import AdminSellerProfilePage from "./pages/admin/SellerProfilePage";
import SettlementsPage from "./pages/admin/SettlementsPage";
import SellerLayout from "./layouts/SellerLayout";
import SellerDashboardPage from "./pages/seller/SellerDashboardPage";
import SellerShipmentsPage from "./pages/seller/SellerShipmentsPage";
import SellerCreateShipmentPage from "./pages/seller/SellerCreateShipmentPage";
import SellerFinancialsPage from "./pages/seller/SellerFinancialsPage";
import NotFound from "./pages/NotFound";

// Optimized QueryClient for high concurrent load (100+ users)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Aggressive caching to reduce DB connections
      staleTime: 60 * 1000, // 1 minute - data considered fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - cache kept in memory
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: false, // Don't refetch on reconnect (we have real-time updates)
      retry: 2, // Retry failed queries 2 times
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
      // Batch requests when possible
      networkMode: 'online',
    },
    mutations: {
      // Optimistic updates disabled for stability
      retry: 2,
      retryDelay: 1000,
    },
  },
});

const ProtectedRoutes = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === "admin") {
    return (
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/shipments" element={<ShipmentsPage />} />
          <Route path="/shipments/create" element={<CreateShipmentPage />} />
          <Route path="/shipments/:id" element={<ShipmentDetailsPage />} />
          <Route path="/couriers" element={<CouriersPage />} />
          <Route path="/couriers/:id" element={<AdminCourierProfilePage />} />
          <Route path="/sellers" element={<SellersPage />} />
          <Route path="/sellers/:id" element={<AdminSellerProfilePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/settlements" element={<SettlementsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  if (user?.role === "seller") {
    return (
      <Routes>
        <Route element={<SellerLayout />}>
          <Route path="/seller" element={<SellerDashboardPage />} />
          <Route path="/seller/shipments" element={<SellerShipmentsPage />} />
          <Route path="/seller/shipments/create" element={<SellerCreateShipmentPage />} />
          <Route path="/seller/financials" element={<SellerFinancialsPage />} />
          <Route path="/" element={<Navigate to="/seller" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/seller" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<CourierLayout />}>
        <Route path="/courier" element={<CourierHomePage />} />
        <Route path="/courier/shipments" element={<CourierShipmentsPage />} />
        <Route path="/courier/shipments/:id" element={<CourierShipmentDetailPage />} />
        <Route path="/courier/cod" element={<CourierCODPage />} />
        <Route path="/courier/profile" element={<CourierProfilePage />} />
        <Route path="/" element={<Navigate to="/courier" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/courier" replace />} />
    </Routes>
  );
};

const AppRoutes = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated 
          ? <Navigate to={user?.role === 'admin' ? '/dashboard' : user?.role === 'seller' ? '/seller' : '/courier'} replace /> 
          : <LoginPage />
      } />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppRoutes />
          </BrowserRouter>
          <Analytics debug={false} />
          <SpeedInsights debug={false} />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
