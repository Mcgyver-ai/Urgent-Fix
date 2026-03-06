import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Droplets, Zap, Key, Flame, ArrowLeft, ArrowRight, Check, Clock, Zap as ZapFast, Calendar, Star } from "lucide-react";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/auth-utils";

const CATEGORY_ICONS: Record<string, any> = {
  plumbing: Droplets,
  electrical: Zap,
  locksmith: Key,
  "boiler-heating": Flame,
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
    if (step === 2) return description.length > 5 && address.line1 && address.city && address.postcode;
    if (step === 3) return true;
    return true;
  };

  const issueSlug = selectedCategory?.slug || "";
  const issues = ISSUE_TYPES[issueSlug] || [];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Request Emergency Help</h1>
          <span className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2 font-medium">{STEPS[step]}</p>
      </div>

      {/* Step 0: Category */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">What type of emergency do you need help with?</p>
          <div className="grid grid-cols-2 gap-4">
            {(categories as any[]).map((cat: any) => {
              const Icon = CATEGORY_ICONS[cat.slug] || Droplets;
              const isSelected = selectedCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  data-testid={`category-option-${cat.slug}`}
                  className={`p-5 rounded-lg border text-left transition-all hover-elevate ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-card-border bg-card"
                  }`}
                >
                  <Icon className={`w-8 h-8 mb-3 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="font-semibold">{cat.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>
                  {isSelected && <Check className="w-4 h-4 text-primary mt-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1: Issue type */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">What's the specific issue?</p>
          <div className="grid grid-cols-1 gap-2">
            {issues.map((issue) => (
              <button
                key={issue}
                onClick={() => setSelectedIssue(issue)}
                data-testid={`issue-option-${issue}`}
                className={`p-4 rounded-lg border text-left transition-all flex items-center justify-between hover-elevate ${
                  selectedIssue === issue
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-card-border bg-card"
                }`}
              >
                <span className="font-medium">{issue}</span>
                {selectedIssue === issue && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))}
            <button
              onClick={() => setSelectedIssue("Other")}
              className={`p-4 rounded-lg border text-left transition-all flex items-center justify-between hover-elevate ${
                selectedIssue === "Other"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-card-border bg-card"
              }`}
            >
              <span className="font-medium text-muted-foreground">Other issue</span>
              {selectedIssue === "Other" && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Description + Address */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Describe the problem</Label>
            <Textarea
              id="description"
              placeholder="E.g. Water is leaking under my kitchen sink and getting worse. It started this morning..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-description"
            />
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">Your address</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="line1">Address line 1</Label>
                <Input
                  id="line1"
                  placeholder="12 Baker Street"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="mt-1"
                  data-testid="input-address-line1"
                />
              </div>
              <div>
                <Label htmlFor="line2">Address line 2 (optional)</Label>
                <Input
                  id="line2"
                  placeholder="Flat 3"
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  className="mt-1"
                  data-testid="input-address-line2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="London"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="mt-1"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    placeholder="SW1A 1AA"
                    value={address.postcode}
                    onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                    className="mt-1"
                    data-testid="input-postcode"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Urgency */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-muted-foreground">How urgently do you need this fixed?</p>
          {[
            { value: "asap", icon: ZapFast, label: "ASAP", desc: "Emergency — I need help as soon as possible", color: "text-red-500" },
            { value: "today", icon: Clock, label: "Today", desc: "Urgent — Today works for me", color: "text-amber-500" },
            { value: "scheduled", icon: Calendar, label: "Scheduled", desc: "I can wait — pick a specific time", color: "text-blue-500" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setUrgency(opt.value as any)}
              data-testid={`urgency-option-${opt.value}`}
              className={`w-full p-5 rounded-lg border text-left transition-all flex items-start gap-4 hover-elevate ${
                urgency === opt.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-card-border bg-card"
              }`}
            >
              <opt.icon className={`w-6 h-6 mt-0.5 shrink-0 ${urgency === opt.value ? "text-primary" : opt.color}`} />
              <div>
                <p className="font-semibold">{opt.label}</p>
                <p className="text-sm text-muted-foreground">{opt.desc}</p>
              </div>
              {urgency === opt.value && <Check className="w-4 h-4 text-primary ml-auto shrink-0 mt-1" />}
            </button>
          ))}
          {urgency === "scheduled" && (
            <div className="mt-4">
              <Label>Preferred date & time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1"
                data-testid="input-scheduled-at"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="space-y-5">
          <p className="text-muted-foreground">Review your booking before submitting.</p>
          <Card className="border-card-border">
            <CardContent className="pt-5 space-y-4">
              <Row label="Service" value={selectedCategory?.name} />
              <Row label="Issue" value={selectedIssue} />
              <Row label="Description" value={description} />
              <Row label="Address" value={`${address.line1}, ${address.city}, ${address.postcode}`} />
              <Row label="Urgency" value={urgency.toUpperCase()} />
              {scheduledAt && <Row label="Scheduled" value={new Date(scheduledAt).toLocaleString()} />}
            </CardContent>
          </Card>

          <Card className="border-card-border bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-300">Callout fee</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">Paid to secure your booking</p>
                </div>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-300">£49.00</p>
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-2">
                Additional work will be quoted separately and must be approved by you before any work begins.
              </p>
            </CardContent>
          </Card>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
