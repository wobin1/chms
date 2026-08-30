import { Eye, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const tones = {
  view: "bg-accent-soft text-accent",
  edit: "bg-accent text-white",
  danger: "bg-danger-soft text-danger",
} as const;

export function IconButton({
  label,
  icon: Icon,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  tone: keyof typeof tones;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-50",
        tones[tone],
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

export const rowIcons = { Eye, Pencil, Trash2 };
