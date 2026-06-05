import { CustomerPortal } from "@dodopayments/nextjs";

const bearerToken = process.env.DODO_PAYMENTS_API_KEY!;
const environment =
  (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ||
  "test_mode";

export const GET = CustomerPortal({
  bearerToken,
  environment,
});