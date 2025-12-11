"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Sparkles, Zap, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function PricingPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{
    isPro: boolean;
    freeEmailsUsed: number;
    freeEmailsRemaining: number;
  } | null>(null);

  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      toast.error("Payment was canceled");
    }
    if (searchParams.get("error")) {
      toast.error("Payment failed. Please try again.");
    }
    if (searchParams.get("success") === "true") {
      toast.success("Payment successful! Welcome to Pro!");
    }

    fetchSubscription();
  }, [searchParams]);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    }
  };

  const handleStripeCheckout = async () => {
    setLoading("stripe");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const handlePayPalCheckout = async () => {
    setLoading("paypal");
    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
      });

      const data = await res.json();

      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        toast.error(data.error || "Failed to start PayPal checkout");
      }
    } catch (error) {
      console.error("PayPal checkout error:", error);
      toast.error("Failed to start PayPal checkout");
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading("manage");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Failed to open billing portal");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container max-w-5xl py-10">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground text-lg">
          Start free, upgrade when you need more
        </p>
      </div>

      {subscription && !subscription.isPro && (
        <div className="text-center mb-8">
          <Badge variant="secondary" className="text-sm px-4 py-2">
            You have used {subscription.freeEmailsUsed} of 1 free email
          </Badge>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className="relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Free
            </CardTitle>
            <CardDescription>Perfect for trying out</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/forever</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>1 AI-generated email</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Google Gemini AI</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Gmail integration</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Basic email tracking</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              {subscription?.isPro ? "Previous Plan" : "Current Plan"}
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className="relative border-primary">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary">Most Popular</Badge>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Pro
            </CardTitle>
            <CardDescription>For power users</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">$10</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="font-medium">Unlimited AI-generated emails</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>All AI providers (Gemini, Claude)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Gmail integration</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Advanced email tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Priority support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            {subscription?.isPro ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={handleManageSubscription}
                disabled={loading !== null}
              >
                {loading === "manage" ? "Loading..." : "Manage Subscription"}
              </Button>
            ) : (
              <>
                <Button
                  className="w-full"
                  onClick={handleStripeCheckout}
                  disabled={loading !== null}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {loading === "stripe" ? "Loading..." : "Pay with Card"}
                </Button>
                <div className="relative w-full">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    or
                  </span>
                </div>
                <Button
                  className="w-full bg-[#0070ba] hover:bg-[#005ea6]"
                  onClick={handlePayPalCheckout}
                  disabled={loading !== null}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.647h6.583c2.183 0 3.87.476 5.014 1.418 1.145.941 1.717 2.297 1.702 4.032-.025 2.238-.726 4.09-2.084 5.504-1.358 1.415-3.264 2.134-5.665 2.134H8.58a.77.77 0 0 0-.757.647l-.747 4.529zm.577-6.91h1.665c1.536 0 2.756-.412 3.625-1.222.868-.81 1.347-1.952 1.422-3.396.05-.96-.19-1.72-.716-2.266-.526-.546-1.334-.82-2.404-.82H8.693l-1.04 7.704z"/>
                  </svg>
                  {loading === "paypal" ? "Loading..." : "Pay with PayPal"}
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="text-center mt-10 text-muted-foreground">
        <p>Secure payment powered by Stripe & PayPal</p>
        <p className="text-sm mt-2">Cancel anytime, no questions asked</p>
      </div>
    </div>
  );
}
