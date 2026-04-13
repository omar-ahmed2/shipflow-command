import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Analytics } from "@vercel/analytics/react";
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

const queryClient = new QueryClient();

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
  const { isAuthenticated, user } = useAuth();

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
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Analytics />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
