import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/layout/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/auth-utils";
import {
  Briefcase, MapPin, Clock, ArrowRight, CheckCircle,
  Star, AlertCircle, Zap, ToggleLeft, ToggleRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Droplets, Key, Flame } from "lucide-react";

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
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
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
    onError: (err) => {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    },
  });

  if (authLoading || providerLoading) return <ProviderDashboardSkeleton />;

  if (!providerData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Become a Provider</h2>
        <p className="text-muted-foreground mb-6">Complete your onboarding to start receiving jobs.</p>
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
          <h1 className="text-2xl font-bold">{providerData.businessName}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {providerData.isVerified ? (
              <span className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" /> Pending verification
              </span>
            )}
            <span className="text-muted-foreground text-sm">·</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {parseFloat(providerData.ratingAverage || "0").toFixed(1)} · {providerData.jobsCompleted} jobs
            </span>
          </div>
        </div>
        <Button
          variant={providerData.isAvailable ? "outline" : "secondary"}
          onClick={() => toggleAvailability.mutate()}
          disabled={toggleAvailability.isPending}
          className="gap-2"
          data-testid="button-toggle-availability"
        >
          {providerData.isAvailable ? (
            <><ToggleRight className="w-4 h-4 text-green-600" /> Available</>
          ) : (
            <><ToggleLeft className="w-4 h-4 text-muted-foreground" /> Unavailable</>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-card-border">
          <CardContent className="pt-5 pb-5">
            <p className="text-2xl font-bold">{availableJobs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Available jobs</p>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="pt-5 pb-5">
            <p className="text-2xl font-bold">{activeJobs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active jobs</p>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="pt-5 pb-5">
            <p className="text-2xl font-bold">{completedJobs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {!providerData.isVerified && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-300">Verification pending</p>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                  You need to be verified by an admin before you can accept jobs. Upload your documents in onboarding.
                </p>
                <Link href="/provider/onboard">
                  <Button size="sm" className="mt-3" data-testid="button-upload-docs">Upload Documents</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="available">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" data-testid="tab-available">
            Available ({availableJobs.length})
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6 space-y-3">
          {availableLoading ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-28" />)}</div>
          ) : availableJobs.length === 0 ? (
            <EmptyState message="No available jobs in your area matching your categories." />
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
                    Accept Job
                  </Button>
                ) : null
              }
            />
          ))}
        </TabsContent>

        <TabsContent value="active" className="mt-6 space-y-3">
          {myJobsLoading ? (
            <div className="space-y-3">{[1].map(i => <Skeleton key={i} className="h-28" />)}</div>
          ) : activeJobs.length === 0 ? (
            <EmptyState message="No active jobs right now." />
          ) : activeJobs.map((job: any) => (
            <Link href={`/provider/jobs/${job.id}`} key={job.id}>
              <JobCard job={job} action={<ArrowRight className="w-4 h-4 text-muted-foreground" />} />
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="mt-6 space-y-3">
          {completedJobs.length === 0 ? (
            <EmptyState message="No completed jobs yet." />
          ) : completedJobs.map((job: any) => (
            <Link href={`/provider/jobs/${job.id}`} key={job.id}>
              <JobCard job={job} action={<ArrowRight className="w-4 h-4 text-muted-foreground" />} />
            </Link>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JobCard({ job, action }: { job: any; action: React.ReactNode }) {
  const CatIcon = CATEGORY_ICONS[job.category?.slug] || Briefcase;
  return (
    <div className="flex items-center gap-4 p-4 border border-card-border rounded-lg bg-card hover-elevate cursor-pointer" data-testid={`card-job-${job.id}`}>
      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <CatIcon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{job.issueType}</p>
          <StatusBadge status={job.status} />
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
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
          {job.urgency === "asap" && (
            <span className="text-red-600 dark:text-red-400 font-medium">ASAP</span>
          )}
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ProviderDashboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between"><Skeleton className="h-12 w-48" /><Skeleton className="h-10 w-32" /></div>
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  );
}
