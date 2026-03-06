import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/layout/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import {
  Users, Briefcase, AlertTriangle, CheckCircle, Clock,
  Star, ShieldCheck, ShieldX, ArrowRight, FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: profile } = useQuery<any>({ queryKey: ["/api/me"], enabled: !!user });

  useEffect(() => {
    if (!authLoading && profile && profile.role !== "admin") {
      window.location.href = "/dashboard";
    }
  }, [profile, authLoading]);

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: providers = [], isLoading: providersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/providers"],
    enabled: !!user,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/bookings"],
    enabled: !!user,
  });

  const { data: disputes = [], isLoading: disputesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/disputes"],
    enabled: !!user,
  });

  const verifyProvider = useMutation({
    mutationFn: async ({ id, isVerified }: { id: number; isVerified: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/providers/${id}/verify`, { isVerified });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: vars.isVerified ? "Provider verified" : "Provider unverified" });
    },
  });

  const [resolutionNotes, setResolutionNotes] = useState<Record<number, string>>({});

  const resolveDispute = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/disputes/${id}`, {
        status: "resolved",
        resolutionNotes: resolutionNotes[id] || "",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Dispute resolved" });
    },
  });

  if (authLoading) return <AdminSkeleton />;

  const pendingProviders = providers.filter((p: any) => !p.isVerified);
  const openDisputes = disputes.filter((d: any) => d.status !== "resolved");

  const STAT_CARDS = [
    { label: "Total Users", value: stats?.totalUsers, icon: Users, iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400" },
    { label: "Providers", value: stats?.totalProviders, icon: Briefcase, iconBg: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600 dark:text-purple-400" },
    { label: "Pending Verif.", value: stats?.pendingVerifications, icon: Clock, iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400" },
    { label: "Active Bookings", value: stats?.activeBookings, icon: CheckCircle, iconBg: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" },
    { label: "Open Disputes", value: stats?.openDisputes, icon: AlertTriangle, iconBg: "bg-red-100 dark:bg-red-900/30", iconColor: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage providers, bookings, and platform disputes.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {STAT_CARDS.map(stat => (
          <Card key={stat.label} className="border-card-border">
            <CardContent className="p-4 sm:p-5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${stat.iconBg}`}>
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <p className="text-2xl font-bold leading-none">{statsLoading ? "—" : (stat.value ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers" data-testid="tab-admin-providers" className="gap-2">
            Providers
            {pendingProviders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingProviders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bookings" data-testid="tab-admin-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="disputes" data-testid="tab-admin-disputes" className="gap-2">
            Disputes
            {openDisputes.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {openDisputes.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers" className="mt-6 space-y-6">
          {providersLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : providers.length === 0 ? (
            <AdminEmpty icon={Briefcase} message="No providers registered yet." />
          ) : (
            <>
              {pendingProviders.length > 0 && (
                <div>
                  <p className="section-label">Pending Verification ({pendingProviders.length})</p>
                  <div className="space-y-3">
                    {pendingProviders.map((p: any) => (
                      <ProviderCard key={p.id} provider={p} onVerify={(v) => verifyProvider.mutate({ id: p.id, isVerified: v })} isPending={verifyProvider.isPending} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="section-label">All Providers ({providers.length})</p>
                <div className="space-y-3">
                  {providers.map((p: any) => (
                    <ProviderCard key={p.id} provider={p} onVerify={(v) => verifyProvider.mutate({ id: p.id, isVerified: v })} isPending={verifyProvider.isPending} />
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="mt-6">
          {bookingsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px]" />)}</div>
          ) : bookings.length === 0 ? (
            <AdminEmpty icon={Briefcase} message="No bookings yet." />
          ) : (
            <div className="space-y-2">
              {bookings.map((b: any) => (
                <Link href={`/bookings/${b.id}`} key={b.id}>
                  <div className="flex items-center gap-4 px-4 py-3.5 border border-card-border rounded-lg bg-card hover-elevate cursor-pointer" data-testid={`admin-booking-${b.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{b.issueType}</span>
                        <StatusBadge status={b.status} />
                        {b.urgency === "asap" && <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">ASAP</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {b.category?.name} · {b.address?.city} · {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="mt-6">
          {disputesLoading ? (
            <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-40" />)}</div>
          ) : disputes.length === 0 ? (
            <AdminEmpty icon={CheckCircle} message="No disputes filed." />
          ) : (
            <div className="space-y-4">
              {disputes.map((d: any) => (
                <Card key={d.id} className="border-card-border" data-testid={`dispute-card-${d.id}`}>
                  <CardContent className="pt-5 pb-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                          <span className="font-semibold text-sm">Booking #{d.bookingId}</span>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Link href={`/bookings/${d.bookingId}`}>
                        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" data-testid={`button-view-dispute-booking-${d.id}`}>
                          <ArrowRight className="w-3.5 h-3.5" /> View Booking
                        </Button>
                      </Link>
                    </div>

                    <div className="rounded-md bg-muted px-3 py-2.5 text-sm">
                      <span className="text-muted-foreground font-medium">Reason: </span>{d.reason}
                    </div>

                    {d.status !== "resolved" ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add resolution notes for both parties..."
                          value={resolutionNotes[d.id] || ""}
                          onChange={(e) => setResolutionNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
                          className="resize-none text-sm"
                          data-testid={`input-resolution-notes-${d.id}`}
                        />
                        <Button
                          size="sm"
                          onClick={() => resolveDispute.mutate(d.id)}
                          disabled={resolveDispute.isPending}
                          data-testid={`button-resolve-dispute-${d.id}`}
                        >
                          Mark Resolved
                        </Button>
                      </div>
                    ) : d.resolutionNotes && (
                      <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-3 py-2.5 text-sm">
                        <span className="font-medium text-green-800 dark:text-green-300">Resolution: </span>
                        <span className="text-green-700 dark:text-green-400">{d.resolutionNotes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProviderCard({ provider, onVerify, isPending }: { provider: any; onVerify: (v: boolean) => void; isPending: boolean }) {
  return (
    <Card className="border-card-border" data-testid={`provider-card-${provider.id}`}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-sm text-muted-foreground">
            {provider.businessName?.[0]?.toUpperCase() || "P"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{provider.businessName}</p>
              {provider.isVerified ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                  <Clock className="w-3 h-3" /> Pending
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{provider.profile?.fullName || provider.profile?.email || "Unknown"}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                {parseFloat(provider.ratingAverage || "0").toFixed(1)}
              </span>
              <span>{provider.jobsCompleted} jobs</span>
              <span>{provider.serviceRadiusKm}km radius</span>
            </div>
            {provider.documents?.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {provider.documents.map((doc: any) => (
                  <span key={doc.id} className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded font-medium">
                    <FileText className="w-3 h-3" />
                    {doc.documentType}
                    <span className={`${doc.verificationStatus === "approved" ? "text-green-600" : "text-amber-600"}`}>
                      ({doc.verificationStatus})
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0">
            {!provider.isVerified ? (
              <Button
                size="sm"
                onClick={() => onVerify(true)}
                disabled={isPending}
                className="gap-1.5"
                data-testid={`button-verify-provider-${provider.id}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Verify
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onVerify(false)}
                disabled={isPending}
                className="gap-1.5"
                data-testid={`button-unverify-provider-${provider.id}`}
              >
                <ShieldX className="w-3.5 h-3.5" /> Unverify
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminEmpty({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-14">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-5 gap-4">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}</div>
      <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
    </div>
  );
}
