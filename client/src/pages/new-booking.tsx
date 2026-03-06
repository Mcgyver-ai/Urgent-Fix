import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/auth-utils";
import {
  Droplets, Zap, Key, Flame,
  ArrowLeft, ArrowRight, Check,
  Clock, Zap as ZapFast, Calendar, ShieldCheck
} from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  plumbing: Droplets,
  electrical: Zap,
  locksmith: Key,
  "boiler-heating": Flame,
};

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  plumbing: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40" },
  electrical: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
  locksmith: { color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-950/40" },
  "boiler-heating": { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40" },
};

const ISSUE_TYPES: Record<string, string[]> = {
  plumbing: ["Burst pipe", "Blocked drain", "Leaking toilet", "No hot water", "Leaking tap", "Boiler leak"],
  electrical: ["Power outage", "Tripping fuse", "Faulty socket", "Urgent lighting issue", "No power in room", "Burning smell"],
  locksmith: ["Locked out", "Broken key", "Lock failure", "Lost keys", "Lock replacement", "Door won't close"],
  "boiler-heating": ["Boiler not starting", "No heating", "No hot water", "Pressure issue", "Radiator cold", "Strange noise"],
};

const STEPS = ["Service", "Issue", "Details", "Urgency", "Confirm"];

export default function NewBookingPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedIssue, setSelectedIssue] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"asap" | "today" | "scheduled">("asap");
  const [scheduledAt, setScheduledAt] = useState("");
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", postcode: "" });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isAuthenticated, authLoading]);

  const { data: categories = [] } = useQuery<any[]>({ queryKey: ["/api/categories"] });

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bookings", data);
      return res.json();
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my"] });
      toast({ title: "Booking submitted!", description: "We're finding a provider near you." });
      setLocation(`/bookings/${booking.id}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({ title: "Error", description: "Failed to create booking. Please try again.", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!address.line1 || !address.city || !address.postcode) {
      toast({ title: "Address required", description: "Please fill in your address.", variant: "destructive" });
      return;
    }
    createBookingMutation.mutate({
      categoryId: selectedCategory.id,
      issueType: selectedIssue,
      description,
      urgency,
      scheduledAt: scheduledAt || undefined,
      address,
    });
  };

  const canGoNext = () => {
    if (step === 0) return !!selectedCategory;
    if (step === 1) return !!selectedIssue;
    if (step === 2) return description.length > 5 && !!address.line1 && !!address.city && !!address.postcode;
    return true;
  };

  const issueSlug = selectedCategory?.slug || "";
  const issues = ISSUE_TYPES[issueSlug] || [];

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      {/* Progress bar + header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Request Emergency Help</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{STEPS[step]} · Step {step + 1} of {STEPS.length}</p>
          </div>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-back-top"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
        </div>
        {/* Progress pills */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < step ? "bg-primary/50" : i === step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      {/* Step 0 — Category */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">What type of emergency do you need help with?</p>
          <div className="grid grid-cols-2 gap-3">
            {(categories as any[]).map((cat: any) => {
              const Icon = CATEGORY_ICONS[cat.slug] || Droplets;
              const colors = CATEGORY_COLORS[cat.slug] || { color: "text-primary", bg: "bg-primary/10" };
              const isSelected = selectedCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  data-testid={`category-option-${cat.slug}`}
                  className={`relative p-5 rounded-lg border text-left transition-all hover-elevate ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-card-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center mb-3 ${colors.bg}`}>
                    <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : colors.color}`} />
                  </div>
                  <p className="font-semibold text-sm">{cat.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{cat.description}</p>
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1 — Issue type */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">What's the specific problem?</p>
          <div className="space-y-2">
            {[...issues, "Other"].map((issue) => (
              <button
                key={issue}
                onClick={() => setSelectedIssue(issue)}
                data-testid={`issue-option-${issue}`}
                className={`w-full px-4 py-3.5 rounded-lg border text-left transition-all flex items-center justify-between hover-elevate ${
                  selectedIssue === issue
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-card-border bg-card hover:border-primary/30"
                }`}
              >
                <span className={`text-sm font-medium ${issue === "Other" ? "text-muted-foreground" : ""}`}>{issue}</span>
                {selectedIssue === issue && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Description + Address */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium">Describe the problem</Label>
            <Textarea
              id="description"
              placeholder="E.g. Water is leaking under my kitchen sink — it started this morning and is getting worse..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[110px] resize-none"
              data-testid="input-description"
            />
            <p className="text-xs text-muted-foreground">More detail helps the engineer prepare before arrival.</p>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold mb-3">Your address</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="line1" className="text-xs text-muted-foreground">Address line 1</Label>
                  <Input id="line1" placeholder="12 Baker Street" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} data-testid="input-address-line1" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="line2" className="text-xs text-muted-foreground">Address line 2 (optional)</Label>
                  <Input id="line2" placeholder="Flat 3" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} data-testid="input-address-line2" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs text-muted-foreground">City</Label>
                    <Input id="city" placeholder="London" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} data-testid="input-city" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postcode" className="text-xs text-muted-foreground">Postcode</Label>
                    <Input id="postcode" placeholder="SW1A 1AA" value={address.postcode} onChange={(e) => setAddress({ ...address, postcode: e.target.value.toUpperCase() })} data-testid="input-postcode" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Urgency */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">How urgently do you need this fixed?</p>
          {[
            {
              value: "asap",
              icon: ZapFast,
              label: "ASAP — Emergency",
              desc: "I need help as soon as possible. Typical response under 60 minutes.",
              accent: "text-red-600 dark:text-red-400",
            },
            {
              value: "today",
              icon: Clock,
              label: "Today",
              desc: "Urgent but today works for me.",
              accent: "text-amber-600 dark:text-amber-400",
            },
            {
              value: "scheduled",
              icon: Calendar,
              label: "Schedule for later",
              desc: "I can wait — pick a date and time that works.",
              accent: "text-blue-600 dark:text-blue-400",
            },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setUrgency(opt.value as any)}
              data-testid={`urgency-option-${opt.value}`}
              className={`w-full p-4 rounded-lg border text-left transition-all flex items-start gap-4 hover-elevate ${
                urgency === opt.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-card-border bg-card hover:border-primary/30"
              }`}
            >
              <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${urgency === opt.value ? "bg-primary/10" : "bg-muted"}`}>
                <opt.icon className={`w-4 h-4 ${urgency === opt.value ? "text-primary" : opt.accent}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.desc}</p>
              </div>
              {urgency === opt.value && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
          {urgency === "scheduled" && (
            <div className="space-y-1.5 mt-2">
              <Label htmlFor="scheduled-at" className="text-sm font-medium">Preferred date and time</Label>
              <Input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                data-testid="input-scheduled-at"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Confirm */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Review your details before submitting.</p>

          <Card className="border-card-border">
            <CardContent className="py-4 divide-y divide-border">
              <ConfirmRow label="Service" value={selectedCategory?.name} />
              <ConfirmRow label="Issue" value={selectedIssue} />
              <ConfirmRow label="Description" value={description} />
              <ConfirmRow label="Address" value={`${address.line1}${address.line2 ? `, ${address.line2}` : ""}, ${address.city}, ${address.postcode}`} />
              <ConfirmRow label="Urgency" value={urgency.charAt(0).toUpperCase() + urgency.slice(1)} highlight={urgency === "asap"} />
              {scheduledAt && <ConfirmRow label="Scheduled" value={new Date(scheduledAt).toLocaleString()} />}
            </CardContent>
          </Card>

          {/* Callout fee */}
          <div className="flex items-center gap-4 rounded-lg border border-card-border bg-card p-4">
            <div className="flex-1">
              <p className="font-semibold text-sm">Callout fee</p>
              <p className="text-xs text-muted-foreground mt-0.5">Secures your booking. Any repair work quoted separately.</p>
            </div>
            <p className="text-2xl font-bold">£49</p>
          </div>

          {/* Trust line */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>You will approve any repair quote before work begins. No surprise charges.</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="button-back" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canGoNext()}
            className="flex-1 gap-2"
            data-testid="button-next"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createBookingMutation.isPending}
            className="flex-1"
            data-testid="button-submit-booking"
          >
            {createBookingMutation.isPending ? "Submitting..." : "Confirm Booking"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ConfirmRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm font-medium flex-1 ${highlight ? "text-red-600 dark:text-red-400" : ""}`}>{value}</span>
    </div>
  );
}
