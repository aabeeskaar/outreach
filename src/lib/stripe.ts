import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

export const stripe = {
  get checkout() {
    return getStripe().checkout;
  },
  get billingPortal() {
    return getStripe().billingPortal;
  },
  get subscriptions() {
    return getStripe().subscriptions;
  },
  get customers() {
    return getStripe().customers;
  },
  get webhooks() {
    return getStripe().webhooks;
  },
};

export const PLANS = {
  FREE: {
    name: "Free",
    description: "1 free email generation",
    price: 0,
    emailLimit: 1,
  },
  PRO: {
    name: "Pro",
    description: "Unlimited email generation",
    price: 10,
    priceId: process.env.STRIPE_PRICE_ID!,
    emailLimit: Infinity,
  },
};

export async function createCheckoutSession(
  userId: string,
  email: string,
  options?: {
    promoCode?: string;
    discountPercent?: number;
    trialDays?: number;
  }
) {
  const stripeClient = getStripe();

  // Build session options
  const sessionOptions: Stripe.Checkout.SessionCreateParams = {
    customer_email: email,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: PLANS.PRO.priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
    metadata: {
      userId,
      promoCode: options?.promoCode || "",
    },
  };

  // Apply discount if provided
  if (options?.discountPercent && options.discountPercent > 0) {
    // Create a coupon for this discount
    const coupon = await stripeClient.coupons.create({
      percent_off: options.discountPercent,
      duration: "once",
      name: options.promoCode ? `Promo: ${options.promoCode}` : "Discount",
    });
    sessionOptions.discounts = [{ coupon: coupon.id }];
  }

  // Apply trial days if provided
  if (options?.trialDays && options.trialDays > 0) {
    sessionOptions.subscription_data = {
      trial_period_days: options.trialDays,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionOptions);

  return session;
}

export async function createCustomerPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
  });

  return session;
}
