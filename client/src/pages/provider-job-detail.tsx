import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/layout/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Link } from "wouter";
import { MapPin, User, FileText, ArrowLeft, CheckCircle, ExternalLink } from "lucide-react";

const PROVIDER_STATUS_ACTIONS = [
  { from: "accepted",          to: "provider_en_route", label: "I'm on my way",      desc: "Confirm you've left for the job" },
  { from: "provider_en_route", to: "arrived",            label: "I've arrived",        desc: "Confirm arrival at the property" },
  { from: "arrived",           to: "diagnosing",         label: "Start diagnosis",     desc: "Begin inspecting the issue" },
  { from: "diagnosing",        to: "quote_pending",      label: "Submit Quote",        desc: "" },
  { from: "quote_approved",    to: "in_progress",        label: "Start Work",          desc: "Customer approved — begin repairs" },
  { from: "in_progress",       to: "completed",          label: "Mark Complete",       desc: "Confirm the job is finished" },
];

export default function ProviderJobDetailPage() {
  const [, params] = useRoute("/provider/jobs/:id");
  const { toast } = useToast();

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [labour, setLabour] = useState("");
  const [parts, setParts] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");

  const bookingId = params?.id;

  const { data: booking, isLoading } = useQuery<any>({
    queryKey: [`/api/bookings/${bookingId}`],
    enabled: !!bookingId,
    refetchInterval: 15000,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/bookings/${bookingId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/my-jobs"] });
      toast({ title: "Status updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update status", variant: "destructive" }),
  });

  const submitQuote = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/bookings/${bookingId}/quotes`, {
        labourAmount: labour,
        partsAmount: parts || "0",
        notes: quoteNotes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      toast({ title: "Quote sent!", description: "The customer will be notified to approve." });
      setShowQuoteForm(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to submit quote", variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  if (!booking) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <p className="text-muted-foreground mb-4">Booking not found.</p>
      <Link href="/provider/dashboard">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>
  );

  const nextAction = PROVIDER_STATUS_ACTIONS.find(a => a.from === booking.status);
  const isQuoteStep = booking.status === "diagnosing";
  const hasQuote = booking.quotes?.length > 0;
  const quoteApproved = booking.quotes?.some((q: any) => q.approvedByCustomer);
  const totalAmount = (parseFloat(labour || "0") + parseFloat(parts || "0")).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* Back + Title */}
      <div className="flex items-start gap-3">
        <Link href="/provider/dashboard">
          <Button size="icon" variant="ghost" className="-ml-1 mt-0.5 shrink-0" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight leading-tight">{booking.issueType}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusBadge status={booking.status} />
            {booking.urgency === "asap" && (
              <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 tracking-wide">ASAP</span>
            )}
          </div>
        </div>
      </div>

      {/* Next action CTA */}
      {nextAction && nextAction.to !== "quote_pending" && (
        <div className="rounded-lg border border-primary/25 bg-primary/5 dark:bg-primary/10 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Next step</p>
            {nextAction.desc && <p className="text-xs text-muted-foreground mt-0.5">{nextAction.desc}</p>}
          </div>
          <Button
            onClick={() => updateStatus.mutate(nextAction.to)}
            disabled={updateStatus.isPending}
            data-testid={`button-status-${nextAction.to}`}
            className="shrink-0"
          >
            {updateStatus.isPending ? "Updating..." : nextAction.label}
          </Button>
        </div>
      )}

      {/* Quote submission */}
      {isQuoteStep && !hasQuote && (
        <>
          {!showQuoteForm ? (
            <div className="rounded-lg border border-card-border bg-card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm">Ready to quote?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Submit a price breakdown for the customer to approve.</p>
              </div>
              <Button variant="outline" onClick={() => setShowQuoteForm(true)} data-testid="button-show-quote-form" className="gap-2 shrink-0">
                <FileText className="w-4 h-4" /> Create Quote
              </Button>
            </div>
          ) : (
            <Card className="border-card-border">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-sm font-semibold">Submit Quote</CardTitle>
              </CardHeader>
              <CardContent className="pb-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Labour (£)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={labour}
                      onChange={(e) => setLabour(e.target.value)}
                      data-testid="input-labour-amount"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Parts (£, optional)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={parts}
                      onChange={(e) => setParts(e.target.value)}
                      data-testid="input-parts-amount"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Notes for customer</Label>
                  <Textarea
                    placeholder="E.g. Replacing the main valve and a 2m section of copper pipe..."
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="resize-none"
                    data-testid="input-quote-notes"
                  />
                </div>
                {labour && (
                  <div className="flex justify-between items-center rounded-md bg-muted px-3 py-2.5 text-sm">
                    <span className="text-muted-foreground">Total to customer</span>
                    <span className="font-semibold">£{totalAmount}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => submitQuote.mutate()}
                    disabled={submitQuote.isPending || !labour}
                    data-testid="button-submit-quote"
                  >
                    {submitQuote.isPending ? "Sending..." : "Send to Customer"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowQuoteForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Existing quote */}
      {hasQuote && (
        <Card className="border-card-border">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Your Quote
              {quoteApproved && (
                <span className="flex items-center gap-1 text-green-700 dark:text-green-400 text-xs font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> Approved
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5 space-y-2.5">
            {booking.quotes.map((q: any) => (
              <div key={q.id} className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Labour</span>
                  <span className="font-medium">£{parseFloat(q.labourAmount).toFixed(2)}</span>
                </div>
                {parseFloat(q.partsAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Parts</span>
                    <span className="font-medium">£{parseFloat(q.partsAmount).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-sm">
                  <span>Total</span>
                  <span>£{parseFloat(q.totalAmount).toFixed(2)}</span>
                </div>
                {!quoteApproved && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Waiting for customer to approve...</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Customer info */}
      <Card className="border-card-border">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{booking.customerProfile?.fullName || "Customer"}</p>
              {booking.customerProfile?.phone && (
                <a href={`tel:${booking.customerProfile.phone}`} className="text-xs text-primary">
                  {booking.customerProfile.phone}
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      {booking.address && (
        <Card className="border-card-border">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium">{booking.address.line1}</p>
                {booking.address.line2 && <p className="text-muted-foreground">{booking.address.line2}</p>}
                <p className="text-muted-foreground">{booking.address.city}, {booking.address.postcode}</p>
              </div>
              <a
                href={`https://maps.google.com?q=${encodeURIComponent([booking.address.line1, booking.address.city, booking.address.postcode].join(", "))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary shrink-0"
                data-testid="link-google-maps"
              >
                Maps <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issue description */}
      <Card className="border-card-border">
        <CardContent className="py-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{booking.category?.name}</span>
            {booking.urgency && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className={`text-xs font-semibold uppercase tracking-wider ${booking.urgency === "asap" ? "text-red-500" : "text-muted-foreground"}`}>
                  {booking.urgency}
                </span>
              </>
            )}
          </div>
          <p className="text-sm leading-relaxed">{booking.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
