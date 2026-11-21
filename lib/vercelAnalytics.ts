const VERCEL_ANALYTICS_API = "https://api.vercel.com/v1/query/web-analytics";

type AnalyticsRow = Record<string, string | number | null | undefined>;

function analyticsConfig() {
  const token = process.env.VERCEL_ANALYTICS_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    throw new Error(
      "Vercel Analytics is not connected. Add VERCEL_ANALYTICS_TOKEN and VERCEL_PROJECT_ID to the Vercel project environment variables.",
    );
  }

  return { token, projectId, teamId };
}

async function queryVercel<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  cacheSeconds = 300,
): Promise<T> {
  const { token, projectId, teamId } = analyticsConfig();
  const url = new URL(`${VERCEL_ANALYTICS_API}/${path}`);
  url.searchParams.set("projectId", projectId);
  if (teamId) url.searchParams.set("teamId", teamId);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "")
      url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    ...(cacheSeconds === 0
      ? { cache: "no-store" as const }
      : { next: { revalidate: cacheSeconds } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        `Vercel Analytics request failed (${response.status}).`,
    );
  }
  return payload as T;
}

function roundedNow() {
  const date = new Date();
  date.setUTCSeconds(0, 0);
  date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 5) * 5);
  return date;
}

function rangeStart(range: string, until: Date) {
  const duration = range === "30d" ? 30 : range === "7d" ? 7 : 1;
  return new Date(until.getTime() - duration * 24 * 60 * 60 * 1000);
}

function normalizeRows(payload: any): AnalyticsRow[] {
  return Array.isArray(payload?.data) ? payload.data : [];
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getVercelAnalyticsDashboard(range = "24h") {
  const until = roundedNow();
  const since = rangeStart(range, until);
  const common = {
    since: since.toISOString(),
    until: until.toISOString(),
  };
  const timeGroup = range === "24h" ? "hour" : "day";
  const [count, trend, pages, devices, referrers, countries, events] =
    await Promise.all([
      queryVercel<any>("visits/count", common),
      queryVercel<any>("visits/aggregate", {
        ...common,
        by: timeGroup,
        limit: range === "30d" ? 31 : range === "7d" ? 8 : 25,
      }),
      queryVercel<any>("visits/aggregate", {
        ...common,
        by: "requestPath",
        limit: 10,
      }),
      queryVercel<any>("visits/aggregate", {
        ...common,
        by: "deviceType",
        limit: 10,
      }),
      queryVercel<any>("visits/aggregate", {
        ...common,
        by: "referrerHostname",
        limit: 10,
      }),
      queryVercel<any>("visits/aggregate", {
        ...common,
        by: "country",
        limit: 25,
      }),
      queryVercel<any>("events/count", {
        since: since.toISOString(),
        until: until.toISOString(),
      }).catch(() => ({ data: { count: 0 } })),
    ]);

  const totals = count?.data || {};
  const eventTotals = events?.data || {};
  return {
    source: "vercel",
    stats: {
      totalViews: numberValue(totals.pageviews),
      uniqueVisitors: numberValue(totals.visitors),
      totalEvents: numberValue(eventTotals.count),
    },
    charts: {
      viewsChartData: normalizeRows(trend).map((row) => {
        const rawTimestamp = String(row.timestamp || row[timeGroup] || "");
        const timestamp = new Date(rawTimestamp);
        const name = Number.isNaN(timestamp.getTime())
          ? rawTimestamp
          : range === "24h"
            ? timestamp.toLocaleTimeString("en-NG", {
                timeZone: "Africa/Lagos",
                hour: "2-digit",
                minute: "2-digit",
              })
            : timestamp.toLocaleDateString("en-NG", {
                timeZone: "Africa/Lagos",
                day: "2-digit",
                month: "short",
              });
        return { name, views: numberValue(row.pageviews) };
      }),
      topPages: normalizeRows(pages).map((row) => ({
        name: String(row.requestPath || "Unknown"),
        value: numberValue(row.pageviews),
      })),
      deviceData: normalizeRows(devices).map((row) => ({
        name: String(row.deviceType || "Unknown"),
        value: numberValue(row.pageviews),
      })),
      referrerData: normalizeRows(referrers).map((row) => ({
        name: String(row.referrerHostname || "Direct"),
        value: numberValue(row.pageviews),
      })),
      locationData: normalizeRows(countries).map((row) => ({
        name: String(row.country || "Unknown"),
        value: numberValue(row.visitors) || numberValue(row.pageviews),
        pageviews: numberValue(row.pageviews),
      })),
    },
  };
}

export async function getVercelActiveVisitors() {
  const until = new Date();
  const since = new Date(until.getTime() - 10 * 60 * 1000);
  const active = await queryVercel<any>(
    "visits/count",
    {
      since: since.toISOString(),
      until: until.toISOString(),
    },
    0,
  );

  return { activeUsers: numberValue(active?.data?.visitors) };
}

export async function getTodayVercelVisitors() {
  const now = new Date();
  const lagosParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    lagosParts.find((entry) => entry.type === type)?.value || "";
  const dateKey = `${part("year")}${part("month")}${part("day")}`;
  const since = new Date(
    `${part("year")}-${part("month")}-${part("day")}T00:00:00+01:00`,
  );
  const result = await queryVercel<any>("visits/count", {
    since: since.toISOString(),
    until: roundedNow().toISOString(),
  });
  return { dateKey, count: numberValue(result?.data?.visitors) };
}
