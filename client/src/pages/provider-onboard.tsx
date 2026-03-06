import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Droplets, Zap, Key, Flame, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

const CATEGORY_ICONS: Record<string, any> = {
  plumbing: Droplets,
  electrical: Zap,
  locksmith: Key,
  "boiler-heating": Flame,
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Provider Onboarding</h1>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2 font-medium">{STEPS[step]}</p>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div>
            <Label>Your full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Smith" className="mt-1" data-testid="input-full-name" />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900000" className="mt-1" data-testid="input-phone" />
          </div>
          <div>
            <Label>Business name</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Smith Plumbing Ltd" className="mt-1" data-testid="input-business-name" />
          </div>
          <div>
            <Label>Service radius (km)</Label>
            <Input type="number" value={serviceRadius} onChange={(e) => setServiceRadius(e.target.value)} min="1" max="100" className="mt-1" data-testid="input-service-radius" />
            <p className="text-xs text-muted-foreground mt-1">How far will you travel for jobs?</p>
          </div>
          <div>
            <Label>About your business</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="10+ years experience in plumbing. Fully insured and certified..." className="mt-1" data-testid="input-bio" />
          </div>
          <Button className="w-full" disabled={!businessName || !fullName} onClick={() => setStep(1)} data-testid="button-next-services">
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <p className="text-muted-foreground">Which services do you offer?</p>
          <div className="grid grid-cols-2 gap-4">
            {(categories as any[]).map((cat: any) => {
              const Icon = CATEGORY_ICONS[cat.slug] || Droplets;
              const selected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  data-testid={`category-toggle-${cat.slug}`}
                  className={`p-4 rounded-lg border text-left transition-all hover-elevate ${
                    selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-card-border bg-card"
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="font-medium text-sm">{cat.name}</p>
                  {selected && <Check className="w-4 h-4 text-primary mt-1" />}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
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

      {step === 2 && (
        <div className="space-y-5">
          <p className="text-muted-foreground">Upload verification documents to be approved.</p>
          <div>
            <Label>Document type</Label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              data-testid="select-doc-type"
            >
              <option value="ID">Government ID</option>
              <option value="Insurance">Public Liability Insurance</option>
              <option value="Certificate">Trade Certification</option>
              <option value="DBS">DBS Check</option>
            </select>
          </div>
          <div>
            <Label>Document URL (optional for MVP)</Label>
            <Input
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1"
              data-testid="input-doc-url"
            />
            <p className="text-xs text-muted-foreground mt-1">In a full deployment, you would upload files directly.</p>
          </div>
          <Button
            className="w-full"
            onClick={() => docMutation.mutate()}
            disabled={docMutation.isPending}
            data-testid="button-submit-documents"
          >
            {docMutation.isPending ? "Uploading..." : "Submit Documents"}
          </Button>
          <button
            onClick={() => setStep(3)}
            className="w-full text-sm text-muted-foreground text-center"
            data-testid="button-skip-documents"
          >
            Skip for now
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center space-y-5 py-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Onboarding Complete!</h2>
            <p className="text-muted-foreground">Your profile has been submitted for review. An admin will verify your account shortly.</p>
          </div>
          <Button onClick={() => setLocation("/provider/dashboard")} data-testid="button-go-to-dashboard">
            Go to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
