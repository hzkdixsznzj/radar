"use client";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const color =
    score >= 8
      ? "bg-radar-green/20 text-radar-green border-radar-green/30"
      : score >= 5
        ? "bg-radar-yellow/20 text-radar-yellow border-radar-yellow/30"
        : "bg-radar-red/20 text-radar-red border-radar-red/30";

  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  };

  return (
    <div
      className={`${color} ${sizeClasses[size]} rounded-full border flex items-center justify-center font-bold font-mono shrink-0`}
    >
      {score}
    </div>
  );
}
