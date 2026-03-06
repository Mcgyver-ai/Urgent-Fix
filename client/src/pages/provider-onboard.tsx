import { useState, useEffect } from "react";
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
import { Droplets, Zap, Key, Flame, Check, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  plumbing: Droplets,
  electrical: Zap,
  locksmith: Key,
  "boiler-heating": Flame,
};

const CATEGORY_COLORS: Record<string, string> = {
  plumbing: "text-blue-600",
  electrical: "text-amber-600",
  locksmith: "text-slate-600",
  "boiler-heating": "text-orange-600",
};

const STEPS = ["Business", "Services", "Documents", "Done"];

export default function ProviderOnboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [serviceRadius, setServiceRadius] = useState("10");
  const [bio, setBio] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [docType, setDocType] = useState("ID");
  const [docUrl, setDocUrl] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, authLoading]);

  const { data: categories = [] } = useQuery<any[]>({ queryKey: ["/api/categories"] });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/provider/onboard", {
        businessName,
        serviceRadiusKm: parseInt(serviceRadius),
        categoryIds: selectedCategories,
        bio,
        fullName,
        phone,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setStep(2);
    },
    onError: () => toast({ title: "Error", description: "Failed to save onboarding details.", variant: "destructive" }),
  });

  const docMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/provider/documents", {
        documentType: docType,
        documentUrl: docUrl || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document submitted for review" });
      setStep(3);
    },
    onError: () => toast({ title: "Error", description: "Failed to upload document.", variant: "destructive" }),
  });

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Provider Onboarding</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{STEPS[step]} · Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < step ? "bg-primary/50" : i === step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      {/* Step 0 — Business details */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Tell us about yourself and your business.</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Your full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Smith" data-testid="input-full-name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Phone number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900000" data-testid="input-phone" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Smith Plumbing Ltd" data-testid="input-business-name" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Service radius (km)</Label>
            <Input
              type="number"
              value={serviceRadius}
              onChange={(e) => setServiceRadius(e.target.value)}
              min="1"
              max="100"
              data-testid="input-service-radius"
            />
            <p className="text-xs text-muted-foreground">How far are you willing to travel for jobs?</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">About your business</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="10+ years in plumbing. Fully insured, Gas Safe registered..."
              className="resize-none"
              data-testid="input-bio"
            />
          </div>

          <Button
            className="w-full gap-2"
            disabled={!businessName || !fullName}
            onClick={() => setStep(1)}
            data-testid="button-next-services"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Step 1 — Services */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Which types of jobs do you cover?</p>
          <div className="grid grid-cols-2 gap-3">
            {(categories as any[]).map((cat: any) => {
              const Icon = CATEGORY_ICONS[cat.slug] || Droplets;
              const color = CATEGORY_COLORS[cat.slug] || "text-primary";
              const selected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  data-testid={`category-toggle-${cat.slug}`}
                  className={`relative p-4 rounded-lg border text-left transition-all hover-elevate ${
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-card-border bg-card hover:border-primary/30"
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2.5 ${selected ? "text-primary" : color}`} />
                  <p className="font-medium text-sm">{cat.name}</p>
                  {selected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <Button
              className="flex-1"
              disabled={selectedCategories.length === 0 || onboardMutation.isPending}
              onClick={() => onboardMutation.mutate()}
              data-testid="button-submit-onboarding"
            >
              {onboardMutation.isPending ? "Saving..." : "Save & Continue"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Documents */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload verification documents. An admin will review before you can accept jobs.
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Document type</Label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              data-testid="select-doc-type"
            >
              <option value="ID">Government ID</option>
              <option value="Insurance">Public Liability Insurance</option>
              <option value="Certificate">Trade Certification</option>
              <option value="DBS">DBS Check</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Document URL</Label>
            <Input
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              data-testid="input-doc-url"
            />
            <p className="text-xs text-muted-foreground">
              In production, you would upload files directly. For now, a URL to the document works.
            </p>
          </div>

          <Button
            className="w-full"
            onClick={() => docMutation.mutate()}
            disabled={docMutation.isPending}
            data-testid="button-submit-documents"
          >
            {docMutation.isPending ? "Submitting..." : "Submit Documents"}
          </Button>

          <button
            onClick={() => setStep(3)}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            data-testid="button-skip-documents"
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <div className="text-center space-y-5 py-6">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-2">You're all set!</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Your profile has been submitted. An admin will verify your account before you start receiving jobs.
            </p>
          </div>
          <Button onClick={() => setLocation("/provider/dashboard")} data-testid="button-go-to-dashboard">
            Go to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
