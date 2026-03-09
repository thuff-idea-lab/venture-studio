"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export default function CheckoutPage() {
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [form, setForm] = useState({
    name: "",
    email: "",
    cardNumber: "",
    expiry: "",
    cvc: "",
  });
  const [errors, setErrors] = useState<string[]>([]);

  const validate = () => {
    const errs: string[] = [];
    if (!form.name.trim()) errs.push("Name is required.");
    if (!form.email.trim() || !form.email.includes("@"))
      errs.push("Valid email is required.");
    if (!form.cardNumber.trim() || form.cardNumber.replace(/\s/g, "").length < 13)
      errs.push("Enter a valid card number.");
    if (!form.expiry.trim()) errs.push("Expiry date is required.");
    if (!form.cvc.trim() || form.cvc.length < 3) errs.push("CVC is required.");
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) {
      setStatus("error");
      return;
    }
    setStatus("processing");
    // Simulate payment processing (Stripe integration in production)
    setTimeout(() => {
      setStatus("success");
    }, 2000);
  };

  if (status === "success") {
    return (
      <div className="mx-auto max-w-[600px] px-4 py-20 text-center sm:px-8">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-6 font-heading text-3xl font-bold text-text-primary">
          Payment Successful!
        </h1>
        <p className="mt-3 text-text-secondary">
          Thank you for purchasing the Cultural Wedding Planner template.
          Your comprehensive wedding planning bundle is ready.
        </p>
        <Card className="mt-8">
          <p className="text-sm font-medium text-text-primary">
            Your download link has been sent to:
          </p>
          <p className="mt-1 text-sm text-primary">{form.email}</p>
          <Button className="mt-4">Download Template</Button>
        </Card>
        <p className="mt-6 text-xs text-text-secondary">
          30-day money-back guarantee. Contact support@culturalweddingplanner.com
          for any issues.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[600px] px-4 py-10 sm:px-8">
      <h1 className="font-heading text-3xl font-bold text-text-primary">
        Checkout
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Get the complete multicultural wedding planning template
      </p>

      {/* Order summary */}
      <Card className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading font-semibold text-text-primary">
              Cultural Wedding Planner — Full Template
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Comprehensive checklist, timeline, and budget template for
              multicultural weddings
            </p>
          </div>
          <p className="font-heading text-2xl font-bold text-text-primary">$49</p>
        </div>
      </Card>

      {/* Payment form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {errors.length > 0 && (
          <div className="rounded-lg border border-error bg-error/10 p-4">
            {errors.map((err, i) => (
              <p key={i} className="text-sm text-error">
                {err}
              </p>
            ))}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-text-primary">
            Full Name
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-text-primary">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
            placeholder="jane@example.com"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-text-primary">
            Card Number
          </label>
          <input
            value={form.cardNumber}
            onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
            placeholder="4242 4242 4242 4242"
            maxLength={19}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary">
              Expiry
            </label>
            <input
              value={form.expiry}
              onChange={(e) => setForm({ ...form, expiry: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              placeholder="MM/YY"
              maxLength={5}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">CVC</label>
            <input
              value={form.cvc}
              onChange={(e) => setForm({ ...form, cvc: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              placeholder="123"
              maxLength={4}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={status === "processing"}
        >
          {status === "processing" ? "Processing…" : "Pay $49"}
        </Button>

        <p className="text-center text-xs text-text-secondary">
          Payments will be processed securely via Stripe in production.
          <br />
          30-day money-back guarantee.
        </p>
      </form>
    </div>
  );
}
