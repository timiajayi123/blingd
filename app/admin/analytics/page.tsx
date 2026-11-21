"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Eye,
  MousePointer2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import VisitorLocationMap from "@/components/admin/VisitorLocationMap";

const COLORS = ["#000000", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8"];
const DASHBOARD_REFRESH_INTERVAL = 5 * 60 * 1000;
const ACTIVE_VISITOR_REFRESH_INTERVAL = 60 * 1000;

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("24h");
  const [data, setData] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [activeVisitorsError, setActiveVisitorsError] = useState("");
  const [error, setError] = useState("");
  const lastFetchRef = useRef(0);

  const fetchData = async () => {
    try {
      lastFetchRef.current = Date.now();
      setLoading(true);
      setError("");
      const res = await fetch(`/api/analytics/stats?range=${range}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load analytics.");
      setData(json);
    } catch (fetchError: any) {
      console.error("Failed to fetch analytics", fetchError);
      setError(fetchError?.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveVisitors = async () => {
    try {
      const res = await fetch("/api/analytics/active", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load active visitors.");
      setActiveUsers(Number(json.activeUsers) || 0);
      setActiveVisitorsError("");
    } catch (fetchError) {
      console.error("Failed to fetch active visitors", fetchError);
      setActiveUsers(null);
      setActiveVisitorsError(
        fetchError instanceof Error ? fetchError.message : "Could not refresh",
      );
    }
  };

  useEffect(() => {
    fetchData();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    const interval = setInterval(
      refreshWhenVisible,
      DASHBOARD_REFRESH_INTERVAL,
    );
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetchRef.current >= DASHBOARD_REFRESH_INTERVAL
      ) {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [range]);

  useEffect(() => {
    fetchActiveVisitors();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchActiveVisitors();
    };
    const interval = setInterval(
      refreshWhenVisible,
      ACTIVE_VISITOR_REFRESH_INTERVAL,
    );
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="w-8 h-8 animate-spin text-black" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">
            Synchronizing Data...
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-white px-6">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Analytics connection needed
          </h1>
          <p className="text-sm leading-6 text-zinc-500">{error}</p>
          <button
            onClick={fetchData}
            className="rounded-xl bg-black px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, trend, subtext }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-zinc-100 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-zinc-100 transition-all group"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
          <Icon size={20} />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
          >
            {trend > 0 ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          {title}
        </p>
        <h3 className="text-3xl font-bold tracking-tighter text-black">
          {value}
        </h3>
        <p className="text-[10px] font-medium text-zinc-300">{subtext}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600">
              System_Live
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-black leading-none">
            Analytics
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 max-w-xs">
            User behavior & traffic insights. Data may take a few minutes to
            refresh.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-100">
          {["24h", "7d", "30d"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${range === r ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Page Views"
          value={data.stats.totalViews.toLocaleString()}
          icon={Eye}
          subtext="Total interactions across site"
        />
        <StatCard
          title="Unique Visitors"
          value={data.stats.uniqueVisitors.toLocaleString()}
          icon={Users}
          subtext="Individual device sessions"
        />
        <StatCard
          title="Currently Online"
          value={activeUsers === null ? "—" : activeUsers.toLocaleString()}
          icon={Clock}
          subtext={
            activeVisitorsError
              ? `Could not refresh · ${activeVisitorsError}`
              : "Currently online · seen in the last 2 minutes"
          }
        />
        <StatCard
          title="Total Events"
          value={data.stats.totalEvents.toLocaleString()}
          icon={MousePointer2}
          subtext="Custom interaction points"
        />
      </div>

      <VisitorLocationMap locations={data.charts.locationData} />

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Page Views Over Time */}
        <div className="lg:col-span-2 bg-white border border-zinc-100 p-10 rounded-[3rem] shadow-sm">
          <div className="flex justify-between items-start mb-10">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-black">
                Traffic Velocity
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Interaction volume distribution
              </p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.charts.viewsChartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000" stopOpacity={0.05} />
                    <stop offset="95%" stopColor="#000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f4f4f5"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: "#a1a1aa" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: "#a1a1aa" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "1.5rem",
                    border: "none",
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                    fontSize: "10px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#000"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white border border-zinc-100 p-10 rounded-[3rem] shadow-sm">
          <div className="space-y-1 mb-10">
            <h3 className="text-xl font-bold tracking-tight text-black">
              Device Index
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Hardware classification
            </p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.deviceData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.charts.deviceData.map((_: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-8">
            {data.charts.deviceData.map((d: any, i: number) => (
              <div
                key={d.name}
                className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-zinc-500">{d.name || "Unknown"}</span>
                </div>
                <span className="text-black">
                  {data.stats.totalViews > 0
                    ? Math.round((d.value / data.stats.totalViews) * 100)
                    : 0}
                  %
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Pages */}
        <div className="bg-white border border-zinc-100 p-10 rounded-[3rem] shadow-sm">
          <div className="space-y-1 mb-10">
            <h3 className="text-xl font-bold tracking-tight text-black">
              Asset Popularity
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Most visited route identifiers
            </p>
          </div>
          <div className="space-y-6">
            {data.charts.topPages.map((page: any) => (
              <div key={page.name} className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-black truncate max-w-[250px]">
                    {page.name}
                  </span>
                  <span className="text-zinc-400">
                    {page.value.toLocaleString()} views
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(page.value / data.charts.topPages[0].value) * 100}%`,
                    }}
                    className="h-full bg-black rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Distribution */}
        <div className="bg-white border border-zinc-100 p-10 rounded-[3rem] shadow-sm">
          <div className="space-y-1 mb-10">
            <h3 className="text-xl font-bold tracking-tight text-black">
              Geographic Flow
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Top country origin points
            </p>
          </div>
          <div className="space-y-6">
            {data.charts.locationData.slice(0, 8).map((loc: any) => (
              <div
                key={loc.name}
                className="flex justify-between items-center pb-4 border-b border-zinc-50 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-[10px] font-black uppercase">
                    {loc.name.substring(0, 2)}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black">
                    {loc.name}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {loc.value.toLocaleString()} page views
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
