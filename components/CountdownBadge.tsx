"use client";

interface CountdownBadgeProps {
  deadline: string | null;
}

export function CountdownBadge({ deadline }: CountdownBadgeProps) {
  if (!deadline) return null;

  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="text-xs font-mono text-radar-text-muted px-2 py-1 rounded bg-radar-border/50">
        Expiré
      </span>
    );
  }

  const isUrgent = diffDays <= 3;
  const color = isUrgent
    ? "text-radar-red bg-radar-red/10 border-radar-red/20"
    : "text-radar-text-muted bg-radar-border/30 border-radar-border";

  return (
    <span
      className={`text-xs font-mono px-2 py-1 rounded border ${color}`}
    >
      J-{diffDays}
    </span>
  );
}
