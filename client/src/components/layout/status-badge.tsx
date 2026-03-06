import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  requested: { label: "Requested", variant: "secondary" },
  accepted: { label: "Accepted", variant: "default" },
  provider_en_route: { label: "En Route", variant: "default" },
  arrived: { label: "Arrived", variant: "default" },
  diagnosing: { label: "Diagnosing", variant: "default" },
  quote_pending: { label: "Quote Pending", variant: "secondary" },
  quote_approved: { label: "Quote Approved", variant: "default" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  disputed: { label: "Disputed", variant: "destructive" },
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  requested: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  provider_en_route: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  arrived: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  diagnosing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  quote_pending: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  quote_approved: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  disputed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "outline" as const };
  const colorClass = STATUS_COLORS[status] || "";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${colorClass} ${className || ""}`}
      data-testid={`status-badge-${status}`}
    >
      {config.label}
    </span>
  );
}
