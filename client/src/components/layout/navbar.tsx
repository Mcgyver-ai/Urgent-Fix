import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Wrench, Bell, ChevronDown, User, LogOut, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  const { data: profile } = useQuery<any>({
    queryKey: ["/api/me"],
    enabled: !!user,
  });

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const initials = user
    ? `${(user as any).firstName?.[0] || ""}${(user as any).lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  const dashboardPath = profile?.role === "admin"
    ? "/admin"
    : profile?.role === "provider"
    ? "/provider/dashboard"
    : "/dashboard";

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Wrench className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">UrgentFix</span>
          </Link>

          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="w-20 h-8 bg-muted rounded-md animate-pulse" />
            ) : user ? (
              <>
                <Link href="/book">
                  <Button size="sm" data-testid="button-new-booking">Get Help Now</Button>
                </Link>

                <Link href="/notifications">
                  <Button size="icon" variant="ghost" className="relative" data-testid="button-notifications">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2" data-testid="button-user-menu">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={(user as any).profileImageUrl} />
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                      </Avatar>
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium truncate">{(user as any).firstName} {(user as any).lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{(user as any).email}</p>
                      {profile?.role && (
                        <Badge variant="secondary" className="mt-1 text-xs capitalize">{profile.role}</Badge>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={dashboardPath} className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="w-4 h-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <a href="/api/logout" className="flex items-center gap-2 text-destructive cursor-pointer">
                        <LogOut className="w-4 h-4" /> Sign out
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <a href="/api/login">
                  <Button variant="ghost" size="sm" data-testid="button-login">Sign in</Button>
                </a>
                <a href="/api/login">
                  <Button size="sm" data-testid="button-signup">Get Started</Button>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
