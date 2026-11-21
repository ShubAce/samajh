import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Samajh home">
      <span className="relative grid size-9 place-items-center rounded-[11px] border-2 border-line bg-ink shadow-[2px_2px_0_var(--color-line)] transition-transform group-hover:-rotate-6">
        <span className="deva pt-0.5 text-[18px] font-bold leading-none text-white">स</span>
        <span className="absolute -right-1.5 -top-1.5 size-3.5 rounded-full border-2 border-line bg-highlight" />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="display text-[20px] font-extrabold tracking-tight text-navy">Samajh</span>
        <span className="deva text-[14px] font-semibold text-slate">समझ</span>
      </span>
    </Link>
  );
}
