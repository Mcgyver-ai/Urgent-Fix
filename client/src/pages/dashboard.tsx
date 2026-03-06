import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/layout/status-badge";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Plus, Clock, CheckCircle, AlertCircle, ArrowRight, Droplets, Zap, Key, Flame } from "lucide-react";
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">Manage your bookings and get emergency help fast.</p>
        </div>
        <Link href="/book">
          <Button data-testid="button-new-booking-dashboard" className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Request Help
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-card-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "—" : activeBookings.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "—" : completedBookings.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? "—" : bookings.filter(b => b.status === "disputed").length}</p>
                <p className="text-xs text-muted-foreground">Disputes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active bookings */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Active Jobs</h2>
        {isLoading ? (
          <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : activeBookings.length === 0 ? (
          <Card className="border-card-border border-dashed">
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">No active jobs</p>
              <p className="text-sm text-muted-foreground mb-4">Book a service when you need urgent help.</p>
              <Link href="/book">
                <Button size="sm" data-testid="empty-state-book">Request Help</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeBookings.map((booking: any) => {
              const CatIcon = CATEGORY_ICONS[booking.category?.slug] || Droplets;
              return (
                <Link href={`/bookings/${booking.id}`} key={booking.id}>
                  <div className="flex items-center gap-4 p-4 border border-card-border rounded-lg cursor-pointer hover-elevate bg-card" data-testid={`card-booking-${booking.id}`}>
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <CatIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{booking.issueType}</p>
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {booking.address?.city} · {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent history */}
      {completedBookings.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent History</h2>
          <div className="space-y-3">
            {completedBookings.slice(0, 5).map((booking: any) => {
              const CatIcon = CATEGORY_ICONS[booking.category?.slug] || Droplets;
              return (
                <Link href={`/bookings/${booking.id}`} key={booking.id}>
                  <div className="flex items-center gap-4 p-4 border border-card-border rounded-lg cursor-pointer hover-elevate bg-card opacity-80" data-testid={`card-history-${booking.id}`}>
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <CatIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{booking.issueType}</p>
                        <StatusBadge status={booking.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {booking.address?.city} · {booking.finalTotal ? `£${booking.finalTotal}` : booking.calloutFee ? `£${booking.calloutFee}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex justify-between">
        <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" /></div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
    </div>
  );
}
