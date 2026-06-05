"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Plan = {
  id: "free" | "pro" | "team";
  name: string;
  tagline?: string;
  price: string;
  period: string;
  cta: string;
  highlight?: boolean;
  features: string[];
  action: "signup" | "checkout";
  productId?: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Get started",
    price: "$0",
    period: "forever",
    cta: "Start for free",
    features: [
      "Daily practice minutes",
      "Basic conversation mode",
      "Community support",
    ],
    action: "signup",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For individuals",
    price: "$12",
    period: "month",
    cta: "Choose Pro",
    features: [
      "Unlimited practice",
      "Advanced AI feedback",
      "Priority support",
    ],
    action: "checkout",
    // Replace with your real Dodo product ID in dashboard (test mode)
    productId: "pdt_pro_monthly_placeholder",
  },
  {
    id: "team",
    name: "Team",
    tagline: "For small teams",
    price: "$29",
    period: "month",
    cta: "Choose Team",
    features: [
      "All Pro features",
      "Seat management",
      "Centralized billing",
    ],
    action: "checkout",
    // Replace with your real Dodo product ID in dashboard (test mode)
    productId: "pdt_team_monthly_placeholder",
    highlight: true,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = React.useState<string | null>(null);

  async function startCheckout(productId: string) {
    try {
      setLoadingPlan(productId);
      const res = await fetch("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Dodo Checkout Session expects product_cart with product_id and quantity
        body: JSON.stringify({
          product_cart: [{ product_id: productId, quantity: 1 }],
          // Optionally pass customer prefill fields or metadata:
          // customer: { email: "test@example.com", name: "Test User" },
          // metadata: { source: "pricing_page" },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Checkout failed (${res.status}) ${text ? "- " + text : ""}`
        );
      }

      const data: { checkout_url?: string } = await res.json();
      if (!data.checkout_url) {
        throw new Error("No checkout_url returned from /checkout");
      }
      window.location.href = data.checkout_url;
    } catch (err: any) {
      console.error("[DodoPayments] checkout error:", err?.message || err);
      alert("Unable to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  function onSelect(plan: Plan) {
    if (plan.action === "signup") {
      router.push("/signup");
      return;
    }
    if (plan.action === "checkout" && plan.productId) {
      void startCheckout(plan.productId);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <section className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground mt-2">
          Embedded checkout powered by Dodo Payments. Start in test mode.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={plan.highlight ? "border-primary shadow-lg" : ""}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-medium">{plan.name}</h3>
                  {plan.tagline ? (
                    <p className="text-sm text-muted-foreground">
                      {plan.tagline}
                    </p>
                  ) : null}
                </div>
                {plan.highlight ? (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Popular
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <span className="text-3xl font-semibold">{plan.price}</span>
                <span className="text-muted-foreground"> / {plan.period}</span>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    • {f}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                onClick={() => onSelect(plan)}
                disabled={
                  plan.action === "checkout" &&
                  !!loadingPlan &&
                  plan.productId === loadingPlan
                }
              >
                {plan.action === "checkout" && loadingPlan === plan.productId
                  ? "Redirecting..."
                  : plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>

      <section className="mt-10 text-center text-xs text-muted-foreground">
        <p>
          Note: All API responses return amounts in the currency&apos;s lowest
          denomination. For example, 5000 with currency USD is $50.00.
        </p>
      </section>
    </main>
  );
}