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
        const promoCode = session.metadata?.promoCode;

        if (userId && session.subscription) {
          const subscriptionData = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subAny = subscriptionData as any;

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionData.id,
              stripePriceId: subscriptionData.items.data[0].price.id,
              status: "ACTIVE",
              currentPeriodStart: new Date(subAny.current_period_start * 1000),
              currentPeriodEnd: new Date(subAny.current_period_end * 1000),
            },
            update: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionData.id,
              stripePriceId: subscriptionData.items.data[0].price.id,
              status: "ACTIVE",
              currentPeriodStart: new Date(subAny.current_period_start * 1000),
              currentPeriodEnd: new Date(subAny.current_period_end * 1000),
            },
          });

          // Record payment transaction
          const amountPaid = session.amount_total ? session.amount_total / 100 : 10;
          await prisma.paymentTransaction.create({
            data: {
              userId,
              provider: "STRIPE",
              providerTxId: session.id,
              amount: amountPaid,
              currency: session.currency?.toUpperCase() || "USD",
              status: "COMPLETED",
              type: "SUBSCRIPTION",
              metadata: {
                subscriptionId: subscriptionData.id,
                customerId: typeof session.customer === "string" ? session.customer : null,
                promoCode: promoCode || null,
              },
            },
          });

          // Record promo code usage if applicable
          if (promoCode) {
            const promo = await prisma.promoCode.findUnique({
              where: { code: promoCode.toUpperCase() },
            });
            if (promo) {
              await prisma.promoCodeUse.create({
                data: {
                  promoCodeId: promo.id,
                  userId,
                },
              });
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subUpdated = subscription as any;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status === "active" ? "ACTIVE" :
                   subscription.status === "canceled" ? "CANCELED" :
                   subscription.status === "past_due" ? "PAST_DUE" :
                   subscription.status === "unpaid" ? "UNPAID" : "FREE",
            currentPeriodStart: new Date(subUpdated.current_period_start * 1000),
            currentPeriodEnd: new Date(subUpdated.current_period_end * 1000),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;

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
