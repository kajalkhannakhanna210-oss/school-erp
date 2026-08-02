"use client";
import { useEffect, useState } from "react";

export function DateValue({ value }: { value: string | null | undefined }) {
  const [format, setFormat] = useState("dd/MM/yyyy");
  useEffect(() => setFormat(localStorage.getItem("school-date-format") ?? "dd/MM/yyyy"), []);
  if (!value) return <>—</>;
  const [year, month, day] = value.slice(0, 10).split("-");
  return <>{format === "MM/dd/yyyy" ? `${month}/${day}/${year}` : format === "yyyy-MM-dd" ? `${year}-${month}-${day}` : `${day}/${month}/${year}`}</>;
}
