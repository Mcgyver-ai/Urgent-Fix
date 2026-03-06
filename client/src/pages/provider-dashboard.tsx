import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/layout/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/auth-utils";
import {
  Briefcase, MapPin, Clock, ArrowRight, CheckCircle,
  Star, AlertCircle, Zap, ToggleLeft, ToggleRight, Droplets, Key, Flame
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_ICONS: Record<string, any> = {
  plumbing: Droplets,
  electrical: Zap,
  locksmith: Key,
  "boiler-heating": Flame,
};

export default function ProviderDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, authLoading]);

  const { data: providerData, isLoading: providerLoading } = useQuery<any>({
    queryKey: ["/api/provider/me"],
    enabled: !!user,
  });

  const { data: availableJobs = [], isLoading: availableLoading } = useQuery<any[]>({
    queryKey: ["/api/provider/available-jobs"],
    enabled: !!user && !!providerData,
    refetchInterval: 30000,
  });

  const { data: myJobs = [], isLoading: myJobsLoading } = useQuery<any[]>({
    queryKey: ["/api/provider/my-jobs"],
    enabled: !!user && !!providerData,
  });

  const toggleAvailability = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/provider/availability", {
        isAvailable: !providerData?.isAvailable,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/me"] });
      toast({ title: "Availability updated" });
    },
  });

  const acceptJob = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/accept`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/available-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/my-jobs"] });
      toast({ title: "Job accepted!", description: "Head to the customer's address now." });
    },
    onError: (err) => toast({ title: "Error", description: (err as Error).message, variant: "destructive" }),
  });

  if (authLoading || providerLoading) return <ProviderSkeleton />;

  if (!providerData) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <Briefcase className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2 tracking-tight">Set up your provider account</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
          Complete your onboarding to start receiving emergency jobs in your area.
        </p>
        <Link href="/provider/onboard">
          <Button data-testid="button-start-onboarding">Start Onboarding</Button>
        </Link>
      </div>
    );
  }

  const activeJobs = myJobs.filter(j => !["completed", "cancelled", "disputed"].includes(j.status));
  const completedJobs = myJobs.filter(j => j.status === "completed");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{providerData.businessName}</h1>
          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap text-sm">
            {providerData.isVerified ? (
              <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Pending verification
              </span>
            )}
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {parseFloat(providerData.ratingAverage || "0").toFixed(1)}
              <span className="text-muted-foreground/60">·</span>
              {providerData.jobsCompleted} jobs
            </span>
          </div>
        </div>

        <Button
          variant={providerData.isAvailable ? "outline" : "secondary"}
          onClick={() => toggleAvailability.mutate()}
          disabled={toggleAvailability.isPending}
          className="gap-2 shrink-0"
          data-testid="button-toggle-availability"
        >
          {providerData.isAvailable ? (
            <>
              <ToggleRight className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-400">Available</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4 text-muted-foreground" />
              <span>Unavailable</span>
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard value={availableJobs.length} label="Available" sub="near you" />
        <StatCard value={activeJobs.length} label="Active" sub="in progress" />
        <StatCard value={completedJobs.length} label="Completed" sub="total" />
      </div>

      {/* Verification warning */}
      {!providerData.isVerified && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-300">Account pending verification</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              Submit your documents to start accepting jobs. An admin will review and verify your account.
            </p>
          </div>
          <Link href="/provider/onboard">
            <Button size="sm" className="shrink-0" data-testid="button-upload-docs">
              Upload Docs
            </Button>
          </Link>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="available">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="available" className="flex-1 sm:flex-none" data-testid="tab-available">
            Available
            {availableJobs.length > 0 && (
              <span className="ml-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {availableJobs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1 sm:flex-none" data-testid="tab-active">
            Active
            {activeJobs.length > 0 && (
              <span className="ml-1.5 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {activeJobs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 sm:flex-none" data-testid="tab-completed">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-5 space-y-2">
          {availableLoading ? (
            <JobListSkeleton />
          ) : availableJobs.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No available jobs"
              message={providerData.isAvailable
                ? "You'll see new jobs here when they come in. We'll notify you."
                : "Toggle your availability on to start receiving jobs."}
            />
          ) : availableJobs.map((job: any) => (
            <JobCard
              key={job.id}
              job={job}
              action={
                providerData.isVerified ? (
                  <Button
                    size="sm"
                    onClick={(e) => { e.preventDefault(); acceptJob.mutate(job.id); }}
                    disabled={acceptJob.isPending}
                    data-testid={`button-accept-job-${job.id}`}
                  >
                    Accept
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Not verified</span>
                )
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="active" className="mt-5 space-y-2">
          {myJobsLoading ? (
            <JobListSkeleton />
          ) : activeJobs.length === 0 ? (
            <EmptyState icon={Briefcase} title="No active jobs" message="Active jobs you've accepted will appear here." />
          ) : activeJobs.map((job: any) => (
            <Link href={`/provider/jobs/${job.id}`} key={job.id}>
              <JobCard job={job} action={<ArrowRight className="w-4 h-4 text-muted-foreground" />} />
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="mt-5 space-y-2">
          {completedJobs.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No completed jobs yet" message="Completed jobs will appear here with a full history." />
          ) : completedJobs.map((job: any) => (
            <Link href={`/provider/jobs/${job.id}`} key={job.id}>
              <JobCard job={job} action={<ArrowRight className="w-4 h-4 text-muted-foreground" />} muted />
            </Link>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <Card className="border-card-border">
      <CardContent className="p-4 sm:p-5">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium mt-0.5">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function JobCard({ job, action, muted = false }: { job: any; action: React.ReactNode; muted?: boolean }) {
  const CatIcon = CATEGORY_ICONS[job.category?.slug] || Briefcase;
  return (
    <div
      className={`flex items-center gap-4 px-4 py-3.5 border border-card-border rounded-lg bg-card hover-elevate cursor-pointer transition-opacity ${muted ? "opacity-70" : ""}`}
      data-testid={`card-job-${job.id}`}
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <CatIcon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{job.issueType}</p>
          <StatusBadge status={job.status} />
          {job.urgency === "asap" && (
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">ASAP</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {job.address && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.address.city}, {job.address.postcode}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }: { icon: any; title: string; message: string }) {
  return (
    <div className="text-center py-14">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="font-semibold text-sm mb-1">{title}</p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{message}</p>
    </div>
  );
}

function JobListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map(i => <Skeleton key={i} className="h-[72px] rounded-lg" />)}
    </div>
  );
}

function ProviderSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between">
        <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-32" /></div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px]" />)}</div>
    </div>
  );
}
