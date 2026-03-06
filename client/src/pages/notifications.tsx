import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bell, Check, Info, AlertCircle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

function getNotifIcon(type: string) {
  if (type?.includes("dispute")) return <AlertCircle className="w-4 h-4 text-red-500" />;
  if (type?.includes("complete")) return <CheckCircle className="w-4 h-4 text-green-500" />;
  return <Info className="w-4 h-4 text-primary" />;
}

export default function NotificationsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) window.location.href = "/api/login";
  }, [isAuthenticated, authLoading]);

  const { data: notifications = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n: any) => !n.isRead);
      await Promise.all(unread.map((n: any) => apiRequest("PATCH", `/api/notifications/${n.id}/read`, {})));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px] rounded-lg" />)}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="border-card-border border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-semibold mb-1">All quiet here</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Updates about your bookings, quotes, and jobs will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((notif: any) => (
            <div
              key={notif.id}
              className={`flex items-start gap-4 px-4 py-3.5 border rounded-lg transition-colors ${
                notif.isRead
                  ? "border-card-border bg-card opacity-60"
                  : "border-primary/20 bg-primary/5 dark:bg-primary/10"
              }`}
              data-testid={`notification-${notif.id}`}
            >
              <div className="mt-0.5 shrink-0">
                {getNotifIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${notif.isRead ? "font-normal" : "font-semibold"}`}>{notif.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                </p>
              </div>
              {!notif.isRead && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 w-7 h-7 mt-0.5"
                  onClick={() => markRead.mutate(notif.id)}
                  disabled={markRead.isPending}
                  data-testid={`button-mark-read-${notif.id}`}
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
