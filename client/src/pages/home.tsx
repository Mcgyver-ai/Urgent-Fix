import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import {
  Droplets, Zap, Key, Flame, CheckCircle, Clock, Shield,
  Star, ArrowRight, ChevronRight, Wrench
} from "lucide-react";

const CATEGORIES = [
  {
    icon: Droplets,
    name: "Plumbing",
    desc: "Burst pipes, blocked drains, leaking toilets",
    issues: ["Burst pipe", "Blocked drain", "Leaking toilet"],
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    ring: "ring-blue-100 dark:ring-blue-900/40",
  },
  {
    icon: Zap,
    name: "Electrical",
    desc: "Power outages, faulty sockets, wiring issues",
    issues: ["Power outage", "Tripping fuse", "Faulty socket"],
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    ring: "ring-amber-100 dark:ring-amber-900/40",
  },
  {
    icon: Key,
    name: "Locksmith",
    desc: "Locked out, broken keys, lock replacements",
    issues: ["Locked out", "Broken key", "Lock failure"],
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/40",
    ring: "ring-slate-100 dark:ring-slate-900/40",
  },
  {
    icon: Flame,
    name: "Boiler / Heating",
    desc: "Boiler repairs, no heating, pressure issues",
    issues: ["Boiler failure", "No heating", "Pressure issue"],
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    ring: "ring-orange-100 dark:ring-orange-900/40",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Describe your problem",
    desc: "Select the category, describe the issue, and share your address. Takes under 2 minutes.",
  },
  {
    step: "2",
    title: "Get matched instantly",
    desc: "We find verified, available local specialists and surface them ranked by distance and rating.",
  },
  {
    step: "3",
    title: "Job done, no surprises",
    desc: "Your engineer arrives, diagnoses the fault, and you approve any quote before work begins.",
  },
];

const TRUST_POINTS = [
  { icon: Shield, label: "Fully verified", desc: "Every provider is ID-checked and document-verified before joining the platform." },
  { icon: Star, label: "Rated & reviewed", desc: "Customers leave honest ratings after every job so you can choose with confidence." },
  { icon: Clock, label: "Under 60-min response", desc: "ASAP bookings are typically answered within the hour, any time of day." },
  { icon: CheckCircle, label: "No surprise bills", desc: "You always see and approve a full quote before any work gets started." },
];

export default function HomePage() {
  const { user } = useAuth();
  const bookHref = user ? "/book" : "/api/login";

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-foreground py-24 md:py-36">
        {/* Subtle colour blobs */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 20% 50%, hsl(14 90% 45% / 0.18) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 80% 30%, hsl(200 80% 40% / 0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            {/* Availability chip */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-sm font-medium text-primary mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Emergency repairs available 24/7
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight text-background mb-6">
              Emergency home repair,{" "}
              <span className="text-primary">booked fast.</span>
            </h1>

            <p className="text-lg text-background/65 leading-relaxed mb-10 max-w-lg">
              Find trusted local plumbers, electricians, locksmiths, and heating engineers when you need urgent help — day or night.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href={bookHref}>
                <Button size="lg" className="gap-2 text-base" data-testid="hero-cta-book">
                  Get Help Now
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="/api/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base border-background/20 text-background bg-background/8"
                  data-testid="hero-cta-provider"
                >
                  Join as Provider
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-8 text-sm text-background/50">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                No upfront cost to browse
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                Approve quotes before work starts
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
                Verified engineers only
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Service categories */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Services</p>
            <h2 className="text-3xl font-bold">We cover all major emergencies</h2>
            <p className="text-muted-foreground mt-2 text-lg">Specialist engineers on call for your most urgent needs.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CATEGORIES.map((cat) => (
              <Link href={bookHref} key={cat.name}>
                <div
                  className={`group rounded-lg p-6 ring-1 ${cat.ring} hover-elevate cursor-pointer h-full flex flex-col bg-background`}
                  data-testid={`card-category-${cat.name}`}
                >
                  <div className={`w-11 h-11 rounded-md flex items-center justify-center mb-4 ${cat.bg}`}>
                    <cat.icon className={`w-5 h-5 ${cat.color}`} />
                  </div>
                  <h3 className="font-semibold text-base mb-1">{cat.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-1">{cat.desc}</p>
                  <ul className="space-y-1 mb-4">
                    {cat.issues.map((issue) => (
                      <li key={issue} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className={`w-1 h-1 rounded-full ${cat.color.replace("text-", "bg-")}`} />
                        {issue}
                      </li>
                    ))}
                  </ul>
                  <span className={`flex items-center gap-1 text-sm font-medium ${cat.color}`}>
                    Book now <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28 bg-card border-y border-card-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Process</p>
            <h2 className="text-3xl font-bold">Fixed in three steps</h2>
            <p className="text-muted-foreground mt-2 text-lg">From problem reported to engineer on-site, we make it simple.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {STEPS.map((step, i) => (
              <div key={step.step} className="flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0">
                    {step.step}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block h-px flex-1 bg-border" />
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex justify-start">
            <Link href={bookHref}>
              <Button size="lg" data-testid="how-it-works-cta">Book a repair now</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Trust</p>
            <h2 className="text-3xl font-bold">Built around your safety</h2>
            <p className="text-muted-foreground mt-2 text-lg">We protect customers at every stage of the booking.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRUST_POINTS.map((point) => (
              <Card key={point.label} className="border-card-border">
                <CardContent className="pt-6 pb-6">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <point.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1.5">{point.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{point.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-primary py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Got a problem right now?
          </h2>
          <p className="text-primary-foreground/75 mb-8 leading-relaxed">
            Thousands of homeowners trust UrgentFix to get emergencies sorted fast. Your next available engineer is waiting.
          </p>
          <Link href={bookHref}>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/25 text-primary-foreground bg-primary-foreground/10 text-base"
              data-testid="cta-banner-book"
            >
              Book in under 2 minutes
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-card-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Wrench className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold">UrgentFix</span>
            </div>
            <p className="text-sm text-muted-foreground">Emergency home repair — fast, trusted, local.</p>
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} UrgentFix</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
