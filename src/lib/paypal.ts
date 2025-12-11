import { Client, Environment, LogLevel, OrdersController, ApiError } from "@paypal/paypal-server-sdk";

const client = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
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

const ordersController = new OrdersController(client);

export async function createPayPalOrder(userId: string) {
  const collect = {
    body: {
      intent: "CAPTURE" as const,
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
      applicationContext: {
        brandName: "OutreachAI",
        landingPage: "BILLING" as const,
        userAction: "PAY_NOW" as const,
        returnUrl: `${process.env.NEXTAUTH_URL}/api/paypal/capture`,
        cancelUrl: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      },
    },
    prefer: "return=minimal",
  };

  try {
    const { body, ...httpResponse } = await ordersController.ordersCreate(collect);
    const order = JSON.parse(body as string);
    return {
      id: order.id,
      status: order.status,
      links: order.links,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("PayPal API Error:", error.message);
      throw new Error(`PayPal Error: ${error.message}`);
    }
    throw error;
  }
}

export async function capturePayPalOrder(orderId: string) {
  const collect = {
    id: orderId,
    prefer: "return=minimal",
  };

  try {
    const { body, ...httpResponse } = await ordersController.ordersCapture(collect);
    const order = JSON.parse(body as string);
    return {
      id: order.id,
      status: order.status,
      payer: order.payer,
      purchaseUnits: order.purchase_units,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("PayPal Capture Error:", error.message);
      throw new Error(`PayPal Capture Error: ${error.message}`);
    }
    throw error;
  }
}

export async function getPayPalOrder(orderId: string) {
  const collect = {
    id: orderId,
  };

  try {
    const { body, ...httpResponse } = await ordersController.ordersGet(collect);
    return JSON.parse(body as string);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("PayPal Get Order Error:", error.message);
      throw new Error(`PayPal Error: ${error.message}`);
    }
    throw error;
  }
}
