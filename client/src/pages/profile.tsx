import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/auth-utils";

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
      toast({ title: "Profile updated!", description: role !== profile?.role ? "Role changed. Redirecting..." : undefined });
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

  if (authLoading || isLoading) return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      <Card className="border-card-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16">
              <AvatarImage src={(user as any)?.profileImageUrl} />
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{(user as any)?.firstName} {(user as any)?.lastName}</p>
              <p className="text-sm text-muted-foreground">{(user as any)?.email}</p>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize mt-1 inline-block">
                {profile?.role || "customer"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Full name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
                data-testid="input-full-name"
              />
            </div>
            <div>
              <Label>Phone number</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 7700 900000"
                className="mt-1"
                data-testid="input-phone"
              />
            </div>
            <div>
              <Label>Account role</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                data-testid="select-role"
              >
                <option value="customer">Customer — Book emergency repairs</option>
                <option value="provider">Provider — Accept and complete jobs</option>
                <option value="admin">Admin — Manage platform</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Changing your role will update what you can access.</p>
            </div>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-card-border">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Account</p>
              <p className="text-sm text-muted-foreground">Sign out of UrgentFix</p>
            </div>
            <a href="/api/logout">
              <Button variant="outline" data-testid="button-sign-out">Sign out</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
