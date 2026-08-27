import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
  icon?: React.ReactNode;
  accent?: "default" | "success" | "warning" | "destructive";
}

export function StatCard({
  label,
  value,
  caption,
  icon,
  accent = "default",
}: StatCardProps) {
  const accentClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-amber-600",
    destructive: "text-destructive",
  };

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-bold tracking-tight",
              accentClass[accent]
            )}
          >
            {value}
          </p>
          {caption && (
            <p className="mt-1.5 text-xs text-muted-foreground">{caption}</p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
