import { Client, Environment, LogLevel, OrdersController, CheckoutPaymentIntent, PaypalExperienceLandingPage, PaypalExperienceUserAction } from "@paypal/paypal-server-sdk";

let ordersControllerInstance: OrdersController | null = null;

function getOrdersController(): OrdersController {
  if (!ordersControllerInstance) {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      throw new Error("PayPal credentials are not configured");
    }

    const client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
      },
      timeout: 0,
      environment: process.env.NODE_ENV === "production"
        ? Environment.Production
        : Environment.Sandbox,
      logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
      },
    });

    ordersControllerInstance = new OrdersController(client);
  }
  return ordersControllerInstance;
}

export async function createPayPalOrder(userId: string) {
  try {
    const response = await getOrdersController().createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: "USD",
              value: "10.00",
            },
            description: "OutreachAI Pro - Monthly Subscription",
            customId: userId,
          },
        ],
        paymentSource: {
          paypal: {
            experienceContext: {
              brandName: "OutreachAI",
              landingPage: PaypalExperienceLandingPage.Billing,
              userAction: PaypalExperienceUserAction.PayNow,
              returnUrl: `${process.env.NEXTAUTH_URL}/api/paypal/capture`,
              cancelUrl: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
            },
          },
        },
      },
    });

    const order = response.result;
    return {
      id: order.id,
      status: order.status,
      links: order.links,
    };
  } catch (error) {
    console.error("PayPal API Error:", error);
    throw new Error("Failed to create PayPal order");
  }
}

export async function capturePayPalOrder(orderId: string) {
  try {
    const response = await getOrdersController().captureOrder({
      id: orderId,
    });

    const order = response.result;
    return {
      id: order.id,
      status: order.status,
      payer: order.payer,
      purchaseUnits: order.purchaseUnits,
    };
  } catch (error) {
    console.error("PayPal Capture Error:", error);
    throw new Error("Failed to capture PayPal order");
  }
}

export async function getPayPalOrder(orderId: string) {
  try {
    const response = await getOrdersController().getOrder({
      id: orderId,
    });

    return response.result;
  } catch (error) {
    console.error("PayPal Get Order Error:", error);
    throw new Error("Failed to get PayPal order");
  }
}
