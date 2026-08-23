import logoUrl from "@/assets/msv-logo-320.jpg";

export function BrandSeal({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-full bg-background ring-1 ring-primary/40 ${className}`}
    >
      <img
        src={logoUrl}
        alt="MSV Catering logo"
        className="h-full w-full scale-[1.75] object-cover"
        loading="eager"
      />
    </span>
  );
}

export function BrandLogoWide({ className = "" }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="MSV Catering — Deliciously Yours, Taste the Difference"
      className={`rounded-xl bg-background object-cover ${className}`}
    />
  );
}
