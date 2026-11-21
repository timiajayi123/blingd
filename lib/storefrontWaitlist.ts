import { Query } from "node-appwrite";

const HUB_ENDPOINT =
  process.env.TIMZI_HUB_APPWRITE_ENDPOINT ||
  "https://fra.cloud.appwrite.io/v1";
const HUB_PROJECT_ID =
  process.env.TIMZI_HUB_APPWRITE_PROJECT_ID || "unconfigured_hub_project";
const HUB_DATABASE_ID = process.env.TIMZI_HUB_DATABASE_ID || "timzi_hub";
const PROJECTS_TABLE = "projects";
const WAITLIST_TABLE = "project_waitlist_subscriptions";

type HubRow = Record<string, unknown> & {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  data?: Record<string, unknown>;
};

type HubRowList = {
  rows?: HubRow[];
  total?: number;
};

async function listRows(tableId: string, queries: string[]) {
  const key = process.env.TIMZI_HUB_APPWRITE_API_KEY;
  if (!key) {
    throw new Error("The private TIMZI Hub waitlist connection is not configured.");
  }

  const url = new URL(
    `${HUB_ENDPOINT.replace(/\/$/, "")}/tablesdb/${encodeURIComponent(HUB_DATABASE_ID)}/tables/${encodeURIComponent(tableId)}/rows`,
  );
  queries.forEach((query) => url.searchParams.append("queries[]", query));

  const response = await fetch(url, {
    headers: {
      "X-Appwrite-Project": HUB_PROJECT_ID,
      "X-Appwrite-Key": key,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const data = (await response.json()) as HubRowList & { message?: string };
  if (!response.ok) {
    throw new Error(data.message || "TIMZI Hub could not return the waitlist.");
  }
  return {
    ...data,
    rows: (data.rows || []).map((row) => ({
      ...row,
      ...(row.data || {}),
    })),
  };
}

export async function loadStorefrontWaitlist() {
  const projectResult = await listRows(PROJECTS_TABLE, [
    Query.equal("slug", [process.env.TIMZI_HUB_PROJECT_SLUG || "unconfigured-project"]),
    Query.limit(1),
  ]);
  const project = projectResult.rows?.[0];
  if (!project) return { subscribers: [], total: 0 };

  const subscribers: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    sourceSite: string;
    consentAt: string;
    joinedAt: string;
    updatedAt: string;
  }> = [];
  let cursor: string | undefined;

  do {
    const result = await listRows(WAITLIST_TABLE, [
      Query.equal("project_id", [project.$id]),
      Query.equal("status", ["subscribed"]),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ]);
    const rows = result.rows || [];
    subscribers.push(
      ...rows.map((row) => ({
        id: row.$id,
        name:
          typeof row.display_name === "string" && row.display_name.trim()
            ? row.display_name.trim()
            : "Google user",
        email: typeof row.email === "string" ? row.email : "",
        status: typeof row.status === "string" ? row.status : "subscribed",
        sourceSite: typeof row.source_site === "string" ? row.source_site : "",
        consentAt: typeof row.consent_at === "string" ? row.consent_at : "",
        joinedAt:
          typeof row.created_at === "string"
            ? row.created_at
            : row.$createdAt || "",
        updatedAt:
          typeof row.updated_at === "string"
            ? row.updated_at
            : row.$updatedAt || "",
      })),
    );
    cursor = rows.length === 100 ? rows.at(-1)?.$id : undefined;
  } while (cursor);

  return { subscribers, total: subscribers.length };
}
