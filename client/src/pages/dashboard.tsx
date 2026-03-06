import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/layout/status-badge";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Plus, Clock, CheckCircle, AlertCircle, ArrowRight, Droplets, Zap, Key, Flame, CalendarDays } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_ICONS: Record<string, any> = {
  plumbing: Droplets,
  electrical: Zap,
  locksmith: Key,
  "boiler-heating": Flame,
};

const ACTIVE_STATUSES = ["requested", "accepted", "provider_en_route", "arrived", "diagnosing", "quote_pending", "quote_approved", "in_progress"];

export default function CustomerDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: profile } = useQuery<any>({ queryKey: ["/api/me"], enabled: !!user });

  const { data: bookings = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/bookings/my"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Please sign in", description: "Redirecting...", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      window.location.href = "/api/login";
    }
  }, [error]);

  const activeBookings = bookings.filter(b => ACTIVE_STATUSES.includes(b.status));
  const completedBookings = bookings.filter(b => b.status === "completed");

  if (authLoading) return <DashboardSkeleton />;

  const firstName = profile?.fullName?.split(" ")[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : "Your Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Track your bookings and get emergency help fast.</p>
        </div>
        <Link href="/book">
          <Button data-testid="button-new-booking-dashboard" className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Request Help
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon={Clock}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
          value={isLoading ? null : activeBookings.length}
          label="Active"
        />
        <StatCard
          icon={CheckCircle}
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
          value={isLoading ? null : completedBookings.length}
          label="Completed"
        />
        <StatCard
          icon={AlertCircle}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
          value={isLoading ? null : bookings.filter(b => b.status === "disputed").length}
          label="Disputes"
        />
      </div>

      {/* Active bookings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Active Jobs</h2>
          {activeBookings.length > 0 && (
            <span className="text-xs text-muted-foreground">{activeBookings.length} in progress</span>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-lg" />)}
          </div>
        ) : activeBookings.length === 0 ? (
          <Card className="border-card-border border-dashed">
            <CardContent className="py-14 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="font-semibold mb-1">No active jobs</p>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                Need urgent help at home? Book a verified specialist right now.
              </p>
              <Link href="/book">
                <Button size="sm" data-testid="empty-state-book">Request Help Now</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeBookings.map((booking: any) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </section>

      {/* Past bookings */}
      {completedBookings.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4">Recent History</h2>
          <div className="space-y-2">
            {completedBookings.slice(0, 5).map((booking: any) => (
              <BookingRow key={booking.id} booking={booking} muted />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, value, label }: any) {
  return (
    <Card className="border-card-border">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold leading-none">
              {value === null ? <span className="text-muted-foreground">—</span> : value}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingRow({ booking, muted = false }: { booking: any; muted?: boolean }) {
  const CatIcon = CATEGORY_ICONS[booking.category?.slug] || Droplets;
  return (
    <Link href={`/bookings/${booking.id}`}>
      <div
        className={`flex items-center gap-4 px-4 py-3.5 border border-card-border rounded-lg cursor-pointer hover-elevate bg-card transition-colors ${muted ? "opacity-70" : ""}`}
        data-testid={`card-booking-${booking.id}`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${muted ? "bg-muted" : "bg-primary/10"}`}>
          <CatIcon className={`w-4 h-4 ${muted ? "text-muted-foreground" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{booking.issueType}</p>
            <StatusBadge status={booking.status} />
            {booking.urgency === "asap" && !muted && (
              <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 tracking-wide">ASAP</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {booking.address?.city}
            {" · "}
            {muted && booking.finalTotal
              ? `£${booking.finalTotal}`
              : formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px]" />)}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px]" />)}
      </div>
    </div>
  );
}
