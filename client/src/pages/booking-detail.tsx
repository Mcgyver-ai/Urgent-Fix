import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/layout/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  MapPin, Clock, User, Star, AlertTriangle, CheckCircle,
  Phone, ArrowLeft, PoundSterling
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="font-semibold mb-1">Booking not found</p>
      <p className="text-sm text-muted-foreground mb-5">This booking may have been removed or you may not have access.</p>
      <Link href="/dashboard">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>
  );

  const isCustomer = profile?.role !== "provider";
  const currentStatusIdx = STATUS_ORDER.indexOf(booking.status);
  const pendingQuote = booking.quotes?.find((q: any) => !q.approvedByCustomer);
  const isTerminal = ["cancelled", "disputed"].includes(booking.status);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* Back + Title */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard">
          <Button size="icon" variant="ghost" className="-ml-1 mt-0.5 shrink-0" data-testid="button-back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight leading-tight">{booking.issueType}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusBadge status={booking.status} />
            {booking.urgency === "asap" && (
              <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 tracking-wide">ASAP</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Provider / Finding banner */}
      {booking.provider ? (
        <Card className="border-card-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{booking.provider.businessName}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>{parseFloat(booking.provider.ratingAverage || "0").toFixed(1)}</span>
                  <span>·</span>
                  <span>{booking.provider.jobsCompleted} jobs completed</span>
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
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3.5">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Finding a provider...</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5">A verified engineer will accept your job shortly.</p>
          </div>
        </div>
      )}

      {/* Quote pending CTA — prominent */}
      {pendingQuote && isCustomer && booking.status === "quote_pending" && (
        <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10">
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="flex items-center gap-2">
              <PoundSterling className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Quote ready for your approval</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labour</span>
                <span className="font-medium">£{parseFloat(pendingQuote.labourAmount).toFixed(2)}</span>
              </div>
              {parseFloat(pendingQuote.partsAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parts</span>
                  <span className="font-medium">£{parseFloat(pendingQuote.partsAmount).toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>£{parseFloat(pendingQuote.totalAmount).toFixed(2)}</span>
              </div>
            </div>
            {pendingQuote.notes && (
              <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">{pendingQuote.notes}</p>
            )}
            <Button
              className="w-full"
              onClick={() => approveMutation.mutate(pendingQuote.id)}
              disabled={approveMutation.isPending}
              data-testid="button-approve-quote"
            >
              {approveMutation.isPending ? "Approving..." : "Approve Quote & Authorise Work"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="border-card-border">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold">Job Timeline</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {isTerminal ? (
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <span className="font-medium text-destructive capitalize">{booking.status}</span>
            </div>
          ) : (
            <ol className="relative">
              {BOOKING_TIMELINE.map((step, i) => {
                const isDone = i <= currentStatusIdx;
                const isCurrent = i === currentStatusIdx;
                const isLast = i === BOOKING_TIMELINE.length - 1;
                return (
                  <li key={step.status} className={`flex gap-3 ${!isLast ? "pb-4" : ""}`}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isDone
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30 bg-background"
                        }`}
                      >
                        {isDone && <CheckMark className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      {!isLast && (
                        <div className={`w-px flex-1 mt-1 ${i < currentStatusIdx ? "bg-primary/40" : "bg-muted"}`} />
                      )}
                    </div>
                    <div className={`pt-0.5 pb-1 ${!isLast ? "" : ""}`}>
                      <span
                        className={`text-sm transition-colors ${
                          isCurrent
                            ? "font-semibold text-primary"
                            : isDone
                            ? "font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                      {isCurrent && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">Now</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Approved quotes (non-pending) */}
      {booking.quotes?.filter((q: any) => q.approvedByCustomer).map((quote: any) => (
        <Card key={quote.id} className="border-card-border">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Approved Quote
              <span className="flex items-center gap-1 text-green-700 dark:text-green-400 text-xs font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Approved
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5 space-y-2.5">
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
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>£{parseFloat(quote.totalAmount).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Address */}
      {booking.address && (
        <Card className="border-card-border">
          <CardContent className="py-4">
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

      {/* Review prompt */}
      {booking.status === "completed" && isCustomer && !booking.review && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-5 pb-5">
            {!showReviewForm ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-300">Job completed!</p>
                  <p className="text-sm text-green-700/80 dark:text-green-400/80 mt-0.5">Leave a review for your provider.</p>
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
                <h3 className="font-semibold text-sm">Rate your experience</h3>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      data-testid={`star-${star}`}
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${star <= reviewRating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
                      />
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
                  <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending} data-testid="button-submit-review">
                    {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing review */}
      {booking.review && (
        <Card className="border-card-border">
          <CardContent className="py-4">
            <div className="flex items-center gap-1.5 mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= booking.review.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            {booking.review.comment && <p className="text-sm text-muted-foreground">{booking.review.comment}</p>}
          </CardContent>
        </Card>
      )}

      {/* Dispute section */}
      {isCustomer && ["arrived", "diagnosing", "in_progress", "completed"].includes(booking.status) && !booking.dispute && (
        <div>
          {!showDisputeForm ? (
            <button
              onClick={() => setShowDisputeForm(true)}
              className="text-sm text-muted-foreground hover:text-destructive underline-offset-2 hover:underline transition-colors"
              data-testid="button-open-dispute"
            >
              Something went wrong? Open a dispute
            </button>
          ) : (
            <Card className="border-destructive/30">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-sm text-destructive">Open a Dispute</CardTitle>
              </CardHeader>
              <CardContent className="pb-5 space-y-4">
                <Textarea
                  placeholder="Describe the issue in detail..."
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
        <Card className="border-destructive/20 bg-red-50 dark:bg-red-950/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="font-semibold text-sm text-destructive">Dispute Open</span>
              <StatusBadge status={booking.dispute.status} />
            </div>
            <p className="text-sm text-muted-foreground">{booking.dispute.reason}</p>
            {booking.dispute.resolutionNotes && (
              <p className="text-sm mt-2 px-3 py-2 bg-background rounded-md border border-card-border">{booking.dispute.resolutionNotes}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CheckMark({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function BookingDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
