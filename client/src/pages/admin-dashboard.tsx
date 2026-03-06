import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/layout/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage providers, bookings, and disputes.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
          { label: "Providers", value: stats?.totalProviders, icon: Briefcase, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20" },
          { label: "Pending Verif.", value: stats?.pendingVerifications, icon: Clock, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20" },
          { label: "Active Bookings", value: stats?.activeBookings, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/20" },
          { label: "Open Disputes", value: stats?.openDisputes, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
        ].map(stat => (
          <Card key={stat.label} className="border-card-border">
            <CardContent className="pt-5 pb-5">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-3 ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{statsLoading ? "—" : (stat.value ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="providers">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="providers" data-testid="tab-admin-providers">
            Providers {pendingProviders.length > 0 && <Badge className="ml-1.5 text-xs">{pendingProviders.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="bookings" data-testid="tab-admin-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="disputes" data-testid="tab-admin-disputes">
            Disputes {openDisputes.length > 0 && <Badge variant="destructive" className="ml-1.5 text-xs">{openDisputes.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers" className="mt-6 space-y-4">
          {providersLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : providers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No providers registered yet.</p>
          ) : (
            <>
              {pendingProviders.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 uppercase tracking-wide">Pending Verification</h3>
                  <div className="space-y-3">
                    {pendingProviders.map((p: any) => (
                      <ProviderCard key={p.id} provider={p} onVerify={(v) => verifyProvider.mutate({ id: p.id, isVerified: v })} isPending={verifyProvider.isPending} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">All Providers</h3>
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
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No bookings yet.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b: any) => (
                <Link href={`/bookings/${b.id}`} key={b.id}>
                  <div className="flex items-center gap-4 p-4 border border-card-border rounded-lg bg-card hover-elevate cursor-pointer" data-testid={`admin-booking-${b.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{b.issueType}</span>
                        <StatusBadge status={b.status} />
                        {b.urgency === "asap" && <span className="text-xs text-red-600 font-medium">ASAP</span>}
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
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-32" />)}</div>
          ) : disputes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No disputes filed.</p>
          ) : (
            <div className="space-y-4">
              {disputes.map((d: any) => (
                <Card key={d.id} className="border-card-border">
                  <CardContent className="pt-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          <span className="font-medium">Booking #{d.bookingId}</span>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}</p>
                      </div>
                      <Link href={`/bookings/${d.bookingId}`}>
                        <Button size="sm" variant="outline" data-testid={`button-view-dispute-booking-${d.id}`}>
                          View Booking
                        </Button>
                      </Link>
                    </div>
                    <div className="bg-muted rounded-md p-3 text-sm">
                      <span className="text-muted-foreground">Reason: </span>{d.reason}
                    </div>
                    {d.status !== "resolved" && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add resolution notes..."
                          value={resolutionNotes[d.id] || ""}
                          onChange={(e) => setResolutionNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
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
                    )}
                    {d.resolutionNotes && (
                      <div className="text-sm bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
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
      <CardContent className="pt-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground font-semibold">
            {provider.businessName?.[0] || "P"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{provider.businessName}</p>
              {provider.isVerified
                ? <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Verified</Badge>
                : <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">Pending</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{provider.profile?.fullName || provider.profile?.email || "Unknown"}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                {parseFloat(provider.ratingAverage || "0").toFixed(1)}
              </span>
              <span>{provider.jobsCompleted} jobs</span>
              <span>{provider.serviceRadiusKm}km radius</span>
            </div>
            {provider.documents?.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {provider.documents.map((doc: any) => (
                  <span key={doc.id} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                    <FileText className="w-3 h-3" /> {doc.documentType}
                    <span className={`ml-1 ${doc.verificationStatus === "approved" ? "text-green-600" : "text-amber-600"}`}>
                      ({doc.verificationStatus})
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {!provider.isVerified ? (
              <Button
                size="sm"
                onClick={() => onVerify(true)}
                disabled={isPending}
                className="gap-1"
                data-testid={`button-verify-provider-${provider.id}`}
              >
                <ShieldCheck className="w-3 h-3" /> Verify
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onVerify(false)}
                disabled={isPending}
                className="gap-1"
                data-testid={`button-unverify-provider-${provider.id}`}
              >
                <ShieldX className="w-3 h-3" /> Unverify
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24" />)}</div>
      <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
    </div>
  );
}
