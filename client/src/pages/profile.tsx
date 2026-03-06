import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { User, Phone, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("customer");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, authLoading]);

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/me"],
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setPhone(profile.phone || "");
      setRole(profile.role || "customer");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/me", { fullName, phone, role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "Profile saved",
        description: role !== profile?.role ? "Role changed — redirecting..." : undefined,
      });
      if (role !== profile?.role) {
        setTimeout(() => {
          if (role === "admin") setLocation("/admin");
          else if (role === "provider") setLocation("/provider/dashboard");
          else setLocation("/dashboard");
        }, 800);
      }
    },
    onError: (err) => {
      if (isUnauthorizedError(err as Error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    },
  });

  const initials = user
    ? `${(user as any).firstName?.[0] || ""}${(user as any).lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  if (authLoading || isLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-[280px] w-full" />
      </div>
    );
  }

  const ROLE_OPTIONS = [
    { value: "customer", label: "Customer", desc: "Book emergency repairs" },
    { value: "provider", label: "Provider", desc: "Accept and complete jobs" },
    { value: "admin", label: "Admin", desc: "Manage the platform" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>

      {/* Identity card */}
      <Card className="border-card-border">
        <CardContent className="pt-6 pb-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-14 h-14">
              <AvatarImage src={(user as any)?.profileImageUrl} />
              <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{(user as any)?.firstName} {(user as any)?.lastName}</p>
              <p className="text-sm text-muted-foreground">{(user as any)?.email}</p>
              <span className="mt-1 inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize font-medium">
                {profile?.role || "customer"}
              </span>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Form fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full-name" className="text-sm font-medium flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" /> Full name
              </Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                data-testid="input-full-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 7700 900000"
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Account role</Label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                      role === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-card-border hover:border-primary/30"
                    }`}
                    data-testid={`role-option-${opt.value}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={role === opt.value}
                      onChange={() => setRole(opt.value)}
                      className="accent-primary"
                      data-testid={`radio-role-${opt.value}`}
                    />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-1">Changing role updates what you can access on the platform.</p>
            </div>

            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="w-full"
              data-testid="button-save-profile"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sign out card */}
      <Card className="border-card-border">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Sign out</p>
              <p className="text-xs text-muted-foreground">Remove your session from this device.</p>
            </div>
            <a href="/api/logout">
              <Button variant="outline" className="gap-2" data-testid="button-sign-out">
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
