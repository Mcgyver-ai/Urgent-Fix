interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  draft:           { label: "Draft",          classes: "bg-muted text-muted-foreground" },
  requested:       { label: "Requested",      classes: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  accepted:        { label: "Accepted",       classes: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  provider_en_route: { label: "En Route",     classes: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  arrived:         { label: "Arrived",        classes: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
  diagnosing:      { label: "Diagnosing",     classes: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" },
  quote_pending:   { label: "Quote Pending",  classes: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  quote_approved:  { label: "Quote Approved", classes: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300" },
  in_progress:     { label: "In Progress",    classes: "bg-primary/10 text-primary dark:bg-primary/20" },
  completed:       { label: "Completed",      classes: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  cancelled:       { label: "Cancelled",      classes: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  disputed:        { label: "Disputed",       classes: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  // dispute statuses
  open:            { label: "Open",           classes: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  investigating:   { label: "Investigating",  classes: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  resolved:        { label: "Resolved",       classes: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    classes: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${config.classes} ${className ?? ""}`}
      data-testid={`status-badge-${status}`}
    >
      {config.label}
    </span>
  );
}
