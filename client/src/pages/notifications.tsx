import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : notifications.length === 0 ? (
        <Card className="border-card-border border-dashed">
          <CardContent className="py-16 text-center">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-4 opacity-40" />
            <p className="font-medium mb-1">No notifications yet</p>
            <p className="text-sm text-muted-foreground">Updates about your bookings will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif: any) => (
            <div
              key={notif.id}
              className={`flex items-start gap-4 p-4 border border-card-border rounded-lg ${notif.isRead ? "bg-card opacity-70" : "bg-card"}`}
              data-testid={`notification-${notif.id}`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${notif.isRead ? "bg-muted" : "bg-primary"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{notif.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                </p>
              </div>
              {!notif.isRead && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => markRead.mutate(notif.id)}
                  data-testid={`button-mark-read-${notif.id}`}
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
