"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";

export function ClassStrengthChart({ data }: { data: { class: string; students: number }[] }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate/50">Class-wise Strength</p>
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

export function CollectionTrendChart({ data }: { data: { month: string; total: number }[] }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate/50">Collection Trend (last 6 months)</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F7" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: number) => `Rs. ${value.toFixed(0)}`} />
            <Line type="monotone" dataKey="total" stroke="#C99A3B" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
