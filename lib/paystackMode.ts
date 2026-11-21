export type PaystackMode = "test" | "live";

export const LOCAL_TEST_EMAILS = [
  "test@example.com",
  "timileyinajayi1206@gmail.com",
  "officialtimzi@gmail.com",
];

export const LIVE_ADMIN_TEST_EMAIL = "officialtimzi@gmail.com";

export function normalizeEmail(email?: string | null) {
  return String(email || "").trim().toLowerCase();
}

export function isLocalTestEmail(email?: string | null) {
  return process.env.NODE_ENV !== "production" && LOCAL_TEST_EMAILS.includes(normalizeEmail(email));
}

export function isLiveAdminTestEmail(email?: string | null) {
  return normalizeEmail(email) === LIVE_ADMIN_TEST_EMAIL;
}

export function envValueForMode(
  testValue: string | undefined,
  liveValue: string | undefined,
  legacyValue: string | undefined,
  mode: PaystackMode
) {
  if (mode === "test") {
    return [testValue, legacyValue].find((value) => value && /^(pk|sk)_test_/.test(value)) || "";
  }

  return [liveValue, legacyValue].find((value) => value && /^(pk|sk)_live_/.test(value)) || "";
}
