import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Navbar } from "@/components/layout/navbar";
import HomePage from "@/pages/home";
import CustomerDashboard from "@/pages/dashboard";
import NewBookingPage from "@/pages/new-booking";
import BookingDetailPage from "@/pages/booking-detail";
import ProviderDashboard from "@/pages/provider-dashboard";
import ProviderJobDetailPage from "@/pages/provider-job-detail";
import ProviderOnboardPage from "@/pages/provider-onboard";
import AdminDashboard from "@/pages/admin-dashboard";
import ProfilePage from "@/pages/profile";
import NotificationsPage from "@/pages/notifications";

function Router() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/dashboard" component={CustomerDashboard} />
          <Route path="/book" component={NewBookingPage} />
          <Route path="/bookings/:id" component={BookingDetailPage} />
          <Route path="/provider/dashboard" component={ProviderDashboard} />
          <Route path="/provider/onboard" component={ProviderOnboardPage} />
          <Route path="/provider/jobs/:id" component={ProviderJobDetailPage} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
