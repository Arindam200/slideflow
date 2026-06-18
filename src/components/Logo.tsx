import { PRODUCT_NAME } from "@/lib/site";

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-medium tracking-tight text-white">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <rect x="2" y="2" width="28" height="28" rx="8" fill="#0007cd" opacity="0.18" />
        <path d="M16 5 L27 11 V21 L16 27 L5 21 V11 Z" stroke="#0007cd" strokeWidth="1.8" fill="none" />
        <path d="M16 12 L21 15 V18 L16 21 L11 18 V15 Z" fill="#0007cd" />
      </svg>
      <span className="text-[17px]">
        Slide<span className="text-brand">flow</span>
      </span>
      <span className="sr-only">{PRODUCT_NAME}</span>
    </span>
  );
}
