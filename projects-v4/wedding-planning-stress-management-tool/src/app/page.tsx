import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

const features = [
  {
    title: "Smart Checklist",
    description:
      "Organize tasks by cultural context — Hindu, Christian, Jewish, and more. Never miss a ritual or tradition.",
    icon: "✓",
    href: "/checklist",
  },
  {
    title: "Visual Timeline",
    description:
      "See your milestones at a glance — from 6 months out to the big day. Stay on track effortlessly.",
    icon: "📅",
    href: "/timeline",
  },
  {
    title: "Budget Tracker",
    description:
      "Track spending across venues, catering, attire, décor, and entertainment. Know exactly where every dollar goes.",
    icon: "💰",
    href: "/budget",
  },
];

const testimonials = [
  {
    quote:
      "Planning two ceremonies felt impossible until I found this tool. It kept everything organized and stress-free.",
    author: "Priya & David",
  },
  {
    quote:
      "The cultural context filters were a lifesaver. I could see Hindu tasks separate from Christian tasks instantly.",
    author: "Ananya & Michael",
  },
  {
    quote:
      "The budget tracker alone saved us from overspending by $3,000. Worth every penny.",
    author: "Sarah & Raj",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 py-20 text-center sm:px-8">
          <h1 className="font-heading text-4xl font-bold leading-tight text-text-primary sm:text-5xl">
            Simplifying Your
            <br />
            <span className="text-primary">Multicultural Wedding Journey</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-text-secondary">
            A checklist, timeline, and budgeting tool designed for couples
            coordinating ceremonies across different cultures and traditions.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/checklist">
              <Button>Get Started Free</Button>
            </Link>
            <Link href="/checkout">
              <Button variant="outline">Get Full Template — $49</Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            30-day money-back guarantee · No account required
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
          <h2 className="font-heading text-center text-3xl font-bold text-text-primary">
            Everything You Need
          </h2>
          <p className="mt-3 text-center text-text-secondary">
            Purpose-built for multicultural weddings
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {features.map((f) => (
              <Link key={f.title} href={f.href}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="mt-4 font-heading text-lg font-semibold text-text-primary">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {f.description}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-surface py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
          <h2 className="font-heading text-center text-3xl font-bold text-text-primary">
            Loved by Couples
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.author}>
                <p className="text-sm italic text-text-secondary">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="mt-4 text-sm font-semibold text-text-primary">
                  — {t.author}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-8">
          <h2 className="font-heading text-3xl font-bold text-text-primary">
            Ready to Plan Stress-Free?
          </h2>
          <p className="mt-3 text-text-secondary">
            Start organizing your multicultural wedding today.
          </p>
          <div className="mt-8">
            <Link href="/checklist">
              <Button>Start Planning</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
