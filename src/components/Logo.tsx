import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Samajh home">
      <span className="relative grid size-8 place-items-center overflow-hidden rounded-[10px] bg-[linear-gradient(135deg,#6c5cff,#46d3ff)] shadow-[0_0_20px_-2px_rgba(108,92,255,.8)]">
        <span className="deva pt-0.5 text-[17px] font-bold leading-none text-white">स</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="display text-[17px] font-bold tracking-tight text-white">Samajh</span>
        <span className="deva text-[14px] font-semibold text-[#a59cff]">समझ</span>
      </span>
    </Link>
  );
}
