import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-baseline gap-2", className)} aria-label="Samajh home">
      <span className="deva text-[25px] font-bold leading-none text-ink" style={{ fontVariationSettings: '"wdth" 110' }}>
        समझ
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-navy" style={{ fontVariationSettings: '"wdth" 112' }}>
        Samajh
      </span>
    </Link>
  );
}
