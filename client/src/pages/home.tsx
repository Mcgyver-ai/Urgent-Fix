import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import {
  Droplets, Zap, Key, Flame, CheckCircle, Clock, Shield,
  Star, ArrowRight, Phone, ChevronRight
} from "lucide-react";

const CATEGORIES = [
  { icon: Droplets, name: "Plumbing", desc: "Burst pipes, blocked drains, leaking toilets", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { icon: Zap, name: "Electrical", desc: "Power outages, faulty sockets, wiring issues", color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  { icon: Key, name: "Locksmith", desc: "Locked out, broken keys, lock replacements", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-950/30" },
  { icon: Flame, name: "Boiler / Heating", desc: "Boiler repairs, no heating, pressure issues", color: "text-primary", bg: "bg-primary/5" },
];

const STEPS = [
  { step: "1", title: "Describe your problem", desc: "Tell us what's wrong and upload photos. Takes less than 2 minutes." },
  { step: "2", title: "Get matched instantly", desc: "We find verified local specialists available right now." },
  { step: "3", title: "Job done fast", desc: "Your engineer arrives, diagnoses, and fixes the issue. You approve any quotes." },
];

const TRUST_POINTS = [
  { icon: Shield, label: "Verified professionals", desc: "Every provider is ID-checked and document-verified before joining." },
  { icon: Star, label: "Rated & reviewed", desc: "Read real reviews from customers after every completed job." },
  { icon: Clock, label: "Fast response", desc: "Typical response time under 60 minutes for ASAP bookings." },
  { icon: CheckCircle, label: "Transparent pricing", desc: "You see the quote before any work begins. No surprise bills." },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground/90 to-foreground/80 text-background py-20 md:py-32">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 30% 40%, hsl(14 90% 45%) 0%, transparent 60%), radial-gradient(circle at 80% 60%, hsl(200 80% 40%) 0%, transparent 60%)"
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary-foreground/90 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Emergency repairs available 24/7
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-background leading-tight mb-6">
              Emergency home repair,{" "}
              <span className="text-primary">booked fast.</span>
            </h1>
            <p className="text-xl text-background/70 mb-10 leading-relaxed max-w-xl">
              Find trusted local plumbers, electricians, locksmiths, and heating engineers when you need urgent help.
            </p>
            <div className="flex flex-wrap gap-4">
              {user ? (
                <Link href="/book">
                  <Button size="lg" data-testid="hero-cta-book" className="text-base gap-2">
                    Get Help Now <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <a href="/api/login">
                  <Button size="lg" data-testid="hero-cta-login" className="text-base gap-2">
                    Get Help Now <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              )}
              <a href="/api/login">
                <Button size="lg" variant="outline" data-testid="hero-cta-provider"
                  className="text-base border-background/30 text-background bg-background/10">
                  Join as Provider
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-6 mt-10 text-background/60 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-primary" />
                No callout fee to browse
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-primary" />
                Approve quotes before work starts
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Emergency services we cover</h2>
            <p className="text-muted-foreground text-lg">Specialist engineers available now in your area</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CATEGORIES.map((cat) => (
              <Link href={user ? "/book" : "/api/login"} key={cat.name}>
                <div className={`rounded-lg p-6 cursor-pointer hover-elevate border border-transparent transition-colors ${cat.bg}`} data-testid={`card-category-${cat.name}`}>
                  <div className={`w-12 h-12 rounded-md flex items-center justify-center mb-4 bg-background ${cat.color}`}>
                    <cat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{cat.name}</h3>
                  <p className="text-muted-foreground text-sm">{cat.desc}</p>
                  <div className="flex items-center gap-1 mt-4 text-sm font-medium text-primary">
                    Book now <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-card border-y border-card-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How it works</h2>
            <p className="text-muted-foreground text-lg">Get help in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.step} className="flex flex-col items-start">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mb-4">
                  {step.step}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute" />
                )}
                <h3 className="font-semibold text-xl mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            {user ? (
              <Link href="/book">
                <Button size="lg" data-testid="how-it-works-cta">Start a booking</Button>
              </Link>
            ) : (
              <a href="/api/login">
                <Button size="lg" data-testid="how-it-works-cta">Start a booking</Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Why customers trust UrgentFix</h2>
            <p className="text-muted-foreground text-lg">Built to protect you at every step</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST_POINTS.map((point) => (
              <Card key={point.label} className="border-card-border">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <point.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{point.label}</h3>
                  <p className="text-muted-foreground text-sm">{point.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-primary py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Ready to get your problem fixed?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8">Join thousands of homeowners who've used UrgentFix to solve emergency repairs fast.</p>
          {user ? (
            <Link href="/book">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10">
                Book now — it only takes 2 minutes
              </Button>
            </Link>
          ) : (
            <a href="/api/login">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground bg-primary-foreground/10">
                Book now — it only takes 2 minutes
              </Button>
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-card-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">UF</span>
              </div>
              <span className="font-bold">UrgentFix</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Emergency home repair. Fast, trusted, local.
            </p>
            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} UrgentFix
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
