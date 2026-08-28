"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Card } from "@/components/ui";
import type { EnquiryDashboardData } from "@/lib/enquiries";
import { useEffect, useState } from "react";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

const ENQUIRY_COLORS = ["#1E2A4A", "#3B82F6", "#C99A3B", "#10B981", "#E11D48", "#8B5CF6", "#64748B"];

function EnquiryPieChart({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return <Card><p className="text-xs uppercase tracking-wide text-slate/50">{title}</p><div className="mt-2 h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={42} outerRadius={76} paddingAngle={2}>{data.map((entry, index) => <Cell key={entry.name} fill={ENQUIRY_COLORS[index % ENQUIRY_COLORS.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div></Card>;
}

export function EnquiryDashboardCharts({ data }: { data: EnquiryDashboardData }) {
  return <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
    <EnquiryPieChart title="Enquiries by Status" data={data.byStatus} />
    <EnquiryPieChart title="Online vs Offline" data={data.onlineOffline} />
    <Card><p className="text-xs uppercase tracking-wide text-slate/50">Enquiries by Class</p><div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.byClass}><CartesianGrid strokeDasharray="3 3" stroke="#EEF1F7" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" name="Enquiries" fill="#1E2A4A" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
    <Card><p className="text-xs uppercase tracking-wide text-slate/50">Enquiries by Source</p><div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.bySource} layout="vertical" margin={{ left: 12, right: 12 }}><CartesianGrid strokeDasharray="3 3" stroke="#EEF1F7" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={84} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" name="Enquiries" fill="#C99A3B" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></Card>
    <Card><p className="text-xs uppercase tracking-wide text-slate/50">Monthly Enquiry Trend</p><div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.monthlyTrend}><CartesianGrid strokeDasharray="3 3" stroke="#EEF1F7" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="enquiries" name="Enquiries" stroke="#1261E8" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></Card>
    <EnquiryPieChart title="Conversion Overview" data={data.conversion} />
  </div>;
}

export function LiveEnquiryDashboardCharts({ initialData }: { initialData: EnquiryDashboardData }) {
  const [data, setData] = useState(initialData);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseClient();
    const refresh = async () => {
      try {
        const response = await fetch("/api/dashboard/enquiries", { cache: "no-store" });
        if (!response.ok) return;
        setData(await response.json());
        setUpdated(true);
      } catch {
        // Keep the last authorized dashboard data if the refresh fails.
      }
    };
    window.addEventListener("enquiry-live-refresh", refresh);
    const channel = supabase
      // Keep database listeners on their own topic. The alert component owns
      // the broadcast topic, and Supabase reuses channels by topic; trying to
      // add postgres listeners after that channel has subscribed throws.
      .channel("dashboard-enquiries-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "enquiries" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiry_followups" }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener("enquiry-live-refresh", refresh);
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="relative">
      {updated && <span className="absolute right-0 top-0 z-10 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Live updated</span>}
      <EnquiryDashboardCharts data={data} />
    </div>
  );
}

export function ClassStrengthChart({
  data,
}: {
  data: { class: string; students: number }[];
}) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate/50">
        Class-wise Strength
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F7" />
            <XAxis dataKey="class" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="students" fill="#1E2A4A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function CollectionTrendChart({
  data,
}: {
  data: { month: string; total: number }[];
}) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate/50">
        Collection Trend (last 6 months)
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F7" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: number) => `Rs. ${value.toFixed(0)}`} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#C99A3B"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function AdmissionComparisonChart({
  data,
}: {
  data: { session: string; current: number; previous: number }[];
}) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate/50">
        Admissions: current vs previous session
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={0} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F7" />
            <XAxis dataKey="session" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar
              dataKey="current"
              name="Current session"
              stroke="#1E2A4A"
              fill="#1E2A4A"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="previous"
              name="Previous session"
              fill="#C99A3B"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function StaffSessionChart({
  data,
}: {
  data: {
    session: string;
    newStaff: number;
    existingStaff: number;
    total: number;
  }[];
}) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate/50">
        Staff by session
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={0} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F7" />
            <XAxis dataKey="session" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar
              dataKey="newStaff"
              name="New staff"
              fill="#C99A3B"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="existingStaff"
              name="Existing staff"
              fill="#4E6A9A"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function StudentSessionChart({
  data,
}: {
  data: { session: string; new: number; old: number }[];
}) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate/50">
        Admissions: Current vs Previous Session
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F7" />
            <XAxis dataKey="session" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar
              dataKey="new"
              name="New Students"
              fill="#C99A3B"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="old"
              name="Old Students"
              fill="#1E2A4A"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
