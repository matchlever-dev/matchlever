import { BrandMark } from "@/components/brand/brand-mark";
import { SiteNavLinks } from "@/components/brand/site-nav-links";
import { cn } from "@/lib/utils";

export function LandingFooter({
  className,
  maxWidthClassName = "max-w-6xl",
}: {
  className?: string;
  maxWidthClassName?: string;
}) {
  return (
    <footer
      className={cn(
        "border-t border-[#2B5B84]/10 bg-[#F7F6F3]",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-12",
          maxWidthClassName
        )}
      >
        <div className="flex items-center gap-3">
          <BrandMark className="h-8 w-auto" />
          <p className="text-sm text-[#5B616B]">
            No names. No bias. Just the right match.
          </p>
        </div>
        <SiteNavLinks />
      </div>
    </footer>
  );
}
