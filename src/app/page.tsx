import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-canvas text-brand-charcoal">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
        <p className="text-sm font-medium tracking-[0.2em] text-brand-primary uppercase">
          Phase 1
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-brand-primary sm:text-6xl">
          MatchLever
        </h1>
        <p className="max-w-xl text-lg text-brand-charcoal/80">
          Enterprise Software Talent Exchange — profiles, references, and
          admin-aware access control.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button className="bg-brand-primary text-white hover:bg-brand-primary/90">
            Get started
          </Button>
          <Button
            variant="outline"
            className="border-brand-accent text-brand-accent hover:bg-brand-accent/10"
          >
            Learn more
          </Button>
        </div>
      </section>
    </main>
  );
}
