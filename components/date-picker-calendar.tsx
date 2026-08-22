"use client";

import { useEffect, useRef, useState } from "react";

interface DatePickerCalendarProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
}

export function DatePickerCalendar({ value, onChange, label, required }: DatePickerCalendarProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedDate = value ? new Date(value) : null;
  const initialDate = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

  const [displayDate, setDisplayDate] = useState<Date>(initialDate);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) setDisplayDate(d);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentYear = displayDate.getFullYear();
  const currentMonth = displayDate.getMonth();

  const currentYearNow = new Date().getFullYear();
  const years = Array.from({ length: 120 }, (_, i) => currentYearNow - 100 + i);
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, () => null);

  const handleDateClick = (day: number) => {
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const formattedDate = `${currentYear}-${monthStr}-${dayStr}`;
    onChange(formattedDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(displayDate);
    newDate.setFullYear(Number(e.target.value));
    setDisplayDate(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(displayDate);
    newDate.setMonth(Number(e.target.value));
    setDisplayDate(newDate);
  };

  const setToday = () => {
    const today = new Date();
    setDisplayDate(today);
    const monthStr = String(today.getMonth() + 1).padStart(2, "0");
    const dayStr = String(today.getDate()).padStart(2, "0");
    onChange(`${today.getFullYear()}-${monthStr}-${dayStr}`);
  };

  const formattedDisplayValue = parsedDate && !isNaN(parsedDate.getTime())
    ? `${parsedDate.getDate()} ${monthsShort[parsedDate.getMonth()]} ${parsedDate.getFullYear()}`
    : "";

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate/70 mb-1.5">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => setShowCalendar(!showCalendar)}
        className="flex min-h-11 w-full items-center justify-between rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-sm text-slate shadow-sm transition focus:border-ink-600 focus:outline-none focus:ring-4 focus:ring-ink-50"
      >
        <span className={formattedDisplayValue ? "text-slate font-medium" : "text-slate/40"}>
          {formattedDisplayValue || "dd/mm/yyyy"}
        </span>
        <svg className="h-4 w-4 text-slate/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showCalendar && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[290px] rounded-xl border border-ink-100 bg-white p-3.5 shadow-xl">
          {/* Header Selectors */}
          <div className="mb-3 flex gap-2">
            <select
              value={currentMonth}
              onChange={handleMonthChange}
              className="flex-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-medium text-ink-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-ink-300"
            >
              {monthsShort.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={handleYearChange}
              className="flex-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm font-medium text-ink-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-ink-300"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate/50 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 text-center text-sm gap-y-1">
            {emptyDays.map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 w-8" />
            ))}

            {daysArray.map((day) => {
              const isSelected =
                parsedDate &&
                parsedDate.getDate() === day &&
                parsedDate.getMonth() === currentMonth &&
                parsedDate.getFullYear() === currentYear;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-colors ${
                    isSelected
                      ? "bg-[#1E293B] text-white font-bold shadow-sm"
                      : "text-slate hover:bg-ink-50 font-medium"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2.5">
            <button
              type="button"
              onClick={setToday}
              className="text-xs font-semibold text-slate/70 hover:text-ink-900"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setShowCalendar(false)}
              className="rounded-lg border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-700 shadow-sm hover:bg-ink-50"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
