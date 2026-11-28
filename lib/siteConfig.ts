export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "BLING’D";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production" ? "https://blingd.ng" : "http://localhost:3000")
).replace(/\/$/, "");
export const SITE_DESCRIPTION = process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Your online store.";
export const SITE_LOGO_URL = process.env.NEXT_PUBLIC_SITE_LOGO_URL || "/placeholder.svg";
export const SITE_FAVICON_URL = process.env.NEXT_PUBLIC_SITE_FAVICON_URL || "/placeholder.svg";
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "";
