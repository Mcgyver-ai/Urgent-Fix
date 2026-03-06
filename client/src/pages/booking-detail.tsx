import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/layout/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  MapPin, Clock, User, Star, AlertTriangle, CheckCircle,
  Phone, ArrowLeft, Wrench, DollarSign
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";

const BOOKING_TIMELINE = [
  { status: "requested", label: "Booking submitted" },
  { status: "accepted", label: "Provider accepted" },
  { status: "provider_en_route", label: "Provider en route" },
  { status: "arrived", label: "Provider arrived" },
  { status: "diagnosing", label: "Diagnosing issue" },
  { status: "quote_pending", label: "Quote submitted" },
  { status: "quote_approved", label: "Quote approved" },
  { status: "in_progress", label: "Work in progress" },
  { status: "completed", label: "Job completed" },
];

const STATUS_ORDER = BOOKING_TIMELINE.map(t => t.status);

export default function BookingDetailPage() {
  const [, params] = useRoute("/bookings/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [disputeReason, setDisputeReason] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const bookingId = params?.id;

  const { data: booking, isLoading } = useQuery<any>({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: !!bookingId,
    refetchInterval: 15000,
  });

  const { data: profile } = useQuery<any>({ queryKey: ["/api/me"] });

  const approveMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/approve`, { bookingId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      toast({ title: "Quote approved", description: "The provider can now begin work." });
    },
    onError: () => toast({ title: "Error", description: "Failed to approve quote", variant: "destructive" }),
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/disputes`, { reason: disputeReason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      toast({ title: "Dispute opened", description: "Our team will review your case." });
      setShowDisputeForm(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to open dispute", variant: "destructive" }),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/reviews`, {
        rating: reviewRating,
        comment: reviewComment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      toast({ title: "Review submitted", description: "Thank you for your feedback!" });
      setShowReviewForm(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to submit review", variant: "destructive" }),
  });

  if (isLoading) return <BookingDetailSkeleton />;
  if (!booking) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">Booking not found.</p>
      <Link href="/dashboard"><Button variant="outline" className="mt-4">Back to Dashboard</Button></Link>
    </div>
  );

  const isCustomer = booking.customerId === (user as any)?.sub || profile?.role !== "provider";
  const currentStatusIdx = STATUS_ORDER.indexOf(booking.status);
  const pendingQuote = booking.quotes?.find((q: any) => !q.approvedByCustomer);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button size="icon" variant="ghost" data-testid="button-back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{booking.issueType}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={booking.status} />
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Provider info */}
      {booking.provider ? (
        <Card className="border-card-border">
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{booking.provider.businessName}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{parseFloat(booking.provider.ratingAverage || "0").toFixed(1)}</span>
                  <span>·</span>
                  <span>{booking.provider.jobsCompleted} jobs</span>
                </div>
              </div>
              {booking.provider.profile?.phone && (
                <a href={`tel:${booking.provider.profile.phone}`}>
                  <Button size="icon" variant="outline" data-testid="button-call-provider">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-card-border bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-300">Finding a provider...</p>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/80">A verified engineer will accept your job shortly.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Job Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {(booking.status === "cancelled" || booking.status === "disputed") ? (
            <div className="flex items-center gap-3 py-2">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <span className="font-medium text-destructive capitalize">{booking.status}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {BOOKING_TIMELINE.map((step, i) => {
                const isDone = i <= currentStatusIdx;
                const isCurrent = i === currentStatusIdx;
                return (
                  <div key={step.status} className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isDone
                        ? "border-primary bg-primary"
                        : "border-muted"
                    }`}>
                      {isDone && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className={`text-sm ${isDone ? "font-medium" : "text-muted-foreground"} ${isCurrent ? "text-primary" : ""}`}>
                      {step.label}
                    </span>
                    {isCurrent && <span className="ml-auto text-xs text-primary font-medium">Current</span>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote */}
      {booking.quotes?.length > 0 && (
        <Card className="border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {booking.quotes.map((quote: any) => (
              <div key={quote.id} className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Labour</span>
                  <span className="font-medium">£{parseFloat(quote.labourAmount).toFixed(2)}</span>
                </div>
                {parseFloat(quote.partsAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Parts</span>
                    <span className="font-medium">£{parseFloat(quote.partsAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-card-border pt-3">
                  <span>Total</span>
                  <span>£{parseFloat(quote.totalAmount).toFixed(2)}</span>
                </div>
                {quote.notes && (
                  <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">{quote.notes}</p>
                )}
                {!quote.approvedByCustomer && isCustomer && booking.status === "quote_pending" && (
                  <Button
                    className="w-full"
                    onClick={() => approveMutation.mutate(quote.id)}
                    disabled={approveMutation.isPending}
                    data-testid="button-approve-quote"
                  >
                    {approveMutation.isPending ? "Approving..." : "Approve Quote & Authorise Work"}
                  </Button>
                )}
                {quote.approvedByCustomer && (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Quote approved
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Address */}
      {booking.address && (
        <Card className="border-card-border">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">{booking.address.line1}</p>
                {booking.address.line2 && <p className="text-muted-foreground">{booking.address.line2}</p>}
                <p className="text-muted-foreground">{booking.address.city}, {booking.address.postcode}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {booking.status === "completed" && isCustomer && !booking.review && (
        <Card className="border-card-border bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-5">
            {!showReviewForm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-300">Job completed!</p>
                  <p className="text-sm text-green-700/80 dark:text-green-400/80">Leave a review for your provider.</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowReviewForm(true)}
                  data-testid="button-leave-review"
                >
                  Leave Review
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold">Rate your experience</h3>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      data-testid={`star-${star}`}
                    >
                      <Star className={`w-7 h-7 ${star <= reviewRating ? "text-amber-500 fill-amber-500" : "text-muted"}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Share your experience..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  data-testid="input-review-comment"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => reviewMutation.mutate()}
                    disabled={reviewMutation.isPending}
                    data-testid="button-submit-review"
                  >
                    {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dispute */}
      {isCustomer && ["arrived", "diagnosing", "in_progress", "completed"].includes(booking.status) && !booking.dispute && (
        <div>
          {!showDisputeForm ? (
            <button
              onClick={() => setShowDisputeForm(true)}
              className="text-sm text-muted-foreground underline-offset-2 hover:text-destructive"
              data-testid="button-open-dispute"
            >
              Open a dispute
            </button>
          ) : (
            <Card className="border-card-border border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive">Open a Dispute</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe the issue..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  data-testid="input-dispute-reason"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => disputeMutation.mutate()}
                    disabled={disputeMutation.isPending || !disputeReason}
                    data-testid="button-submit-dispute"
                  >
                    Submit Dispute
                  </Button>
                  <Button variant="outline" onClick={() => setShowDisputeForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {booking.dispute && (
        <Card className="border-card-border">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="font-medium text-destructive">Dispute Open</span>
              <StatusBadge status={booking.dispute.status} />
            </div>
            <p className="text-sm text-muted-foreground">{booking.dispute.reason}</p>
            {booking.dispute.resolutionNotes && (
              <p className="text-sm mt-2 p-2 bg-muted rounded-md">{booking.dispute.resolutionNotes}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
}

function BookingDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
