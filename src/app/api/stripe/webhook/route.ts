import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId && session.subscription) {
          const subscriptionData = await stripe.subscriptions.retrieve(
            session.subscription as string
          ) as Stripe.Subscription;

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionData.id,
              stripePriceId: subscriptionData.items.data[0].price.id,
              status: "ACTIVE",
              currentPeriodStart: new Date(subscriptionData.current_period_start * 1000),
              currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
            },
            update: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionData.id,
              stripePriceId: subscriptionData.items.data[0].price.id,
              status: "ACTIVE",
              currentPeriodStart: new Date(subscriptionData.current_period_start * 1000),
              currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status === "active" ? "ACTIVE" :
                   subscription.status === "canceled" ? "CANCELED" :
                   subscription.status === "past_due" ? "PAST_DUE" :
                   subscription.status === "unpaid" ? "UNPAID" : "FREE",
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: "CANCELED",
            cancelAtPeriodEnd: false,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription as string },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
