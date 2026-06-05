import { Checkout } from "@dodopayments/nextjs";

const bearerToken = process.env.DODO_PAYMENTS_API_KEY!;
const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL;
const environment =
  (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ||
  "test_mode";

export const GET = Checkout({
  bearerToken,
  returnUrl,
  environment,
  type: "static",
});

export const POST = Checkout({
  bearerToken,
  returnUrl,
  environment,
  type: "session",
});