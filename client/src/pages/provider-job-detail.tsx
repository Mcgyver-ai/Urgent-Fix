import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/layout/status-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Link } from "wouter";
import { MapPin, User, FileText, ArrowLeft, Camera } from "lucide-react";
import { format } from "date-fns";

const PROVIDER_STATUS_ACTIONS = [
  { from: "accepted", to: "provider_en_route", label: "Mark En Route" },
  { from: "provider_en_route", to: "arrived", label: "Mark Arrived" },
  { from: "arrived", to: "diagnosing", label: "Start Diagnosing" },
  { from: "diagnosing", to: "quote_pending", label: "Submit Quote" },
  { from: "quote_approved", to: "in_progress", label: "Start Work" },
  { from: "in_progress", to: "completed", label: "Mark Complete" },
];

export default function ProviderJobDetailPage() {
  const [, params] = useRoute("/provider/jobs/:id");
  const { toast } = useToast();
  const { user } = useAuth();

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [labour, setLabour] = useState("");
  const [parts, setParts] = useState("0");
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
      toast({ title: "Quote submitted!", description: "The customer will be notified." });
      setShowQuoteForm(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to submit quote", variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
  if (!booking) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">Booking not found.</p>
      <Link href="/provider/dashboard"><Button variant="outline" className="mt-4">Back</Button></Link>
    </div>
  );

  const nextAction = PROVIDER_STATUS_ACTIONS.find(a => a.from === booking.status);
  const hasQuote = booking.quotes?.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/provider/dashboard">
          <Button size="icon" variant="ghost" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{booking.issueType}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={booking.status} />
            {booking.urgency === "asap" && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">ASAP</span>
            )}
          </div>
        </div>
      </div>

      {/* Customer info */}
      <Card className="border-card-border">
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{booking.customerProfile?.fullName || "Customer"}</p>
              {booking.customerProfile?.phone && (
                <a href={`tel:${booking.customerProfile.phone}`} className="text-sm text-primary">{booking.customerProfile.phone}</a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      {booking.address && (
        <Card className="border-card-border">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{booking.address.line1}</p>
                {booking.address.line2 && <p className="text-sm text-muted-foreground">{booking.address.line2}</p>}
                <p className="text-sm text-muted-foreground">{booking.address.city}, {booking.address.postcode}</p>
                <a
                  href={`https://maps.google.com?q=${encodeURIComponent([booking.address.line1, booking.address.city, booking.address.postcode].join(", "))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary mt-1 inline-block"
                  data-testid="link-google-maps"
                >
                  Open in Maps
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issue description */}
      <Card className="border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Issue Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{booking.description}</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span>Category: {booking.category?.name}</span>
            <span>·</span>
            <span>Urgency: {booking.urgency?.toUpperCase()}</span>
          </div>
          {booking.photos?.length > 0 && (
            <div className="flex gap-2 mt-3">
              {booking.photos.map((photo: any) => (
                <div key={photo.id} className="w-20 h-20 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                  <Camera className="w-5 h-5" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote section */}
      {hasQuote && (
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Quote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {booking.quotes.map((q: any) => (
              <div key={q.id}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Labour</span>
                  <span>£{parseFloat(q.labourAmount).toFixed(2)}</span>
                </div>
                {parseFloat(q.partsAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Parts</span>
                    <span>£{parseFloat(q.partsAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-card-border pt-2 mt-2">
                  <span>Total</span>
                  <span>£{parseFloat(q.totalAmount).toFixed(2)}</span>
                </div>
                {q.approvedByCustomer && (
                  <p className="text-sm text-green-700 dark:text-green-400 mt-2">Customer approved this quote</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {nextAction && nextAction.to !== "quote_pending" && (
          <Button
            className="w-full"
            onClick={() => updateStatus.mutate(nextAction.to)}
            disabled={updateStatus.isPending}
            data-testid={`button-status-${nextAction.to}`}
          >
            {updateStatus.isPending ? "Updating..." : nextAction.label}
          </Button>
        )}

        {booking.status === "diagnosing" && !hasQuote && (
          <>
            {!showQuoteForm ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowQuoteForm(true)}
                data-testid="button-show-quote-form"
              >
                <FileText className="w-4 h-4 mr-2" /> Submit Quote
              </Button>
            ) : (
              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Submit Quote</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Labour cost (£)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={labour}
                      onChange={(e) => setLabour(e.target.value)}
                      className="mt-1"
                      data-testid="input-labour-amount"
                    />
                  </div>
                  <div>
                    <Label>Parts cost (£, optional)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={parts}
                      onChange={(e) => setParts(e.target.value)}
                      className="mt-1"
                      data-testid="input-parts-amount"
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="E.g. Replacing the main valve and pipe section..."
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      className="mt-1"
                      data-testid="input-quote-notes"
                    />
                  </div>
                  {labour && (
                    <div className="bg-muted rounded-md p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-semibold">£{(parseFloat(labour || "0") + parseFloat(parts || "0")).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => submitQuote.mutate()}
                      disabled={submitQuote.isPending || !labour}
                      data-testid="button-submit-quote"
                    >
                      {submitQuote.isPending ? "Submitting..." : "Send to Customer"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowQuoteForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
