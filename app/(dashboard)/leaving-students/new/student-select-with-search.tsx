"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui";

export interface StudentOption {
  id: string;
  admission_number: string;
  father_name?: string | null;
  mother_name?: string | null;
  profiles?: { full_name?: string | null } | { full_name?: string | null }[] | null;
  classes?: { name?: string | null } | { name?: string | null }[] | null;
  sections?: { name?: string | null } | { name?: string | null }[] | null;
}

interface StudentSelectProps {
  students: StudentOption[];
  selectedStudentId: string;
}

export function StudentSelectWithSearch({ students, selectedStudentId }: StudentSelectProps) {
  const [selectedId, setSelectedId] = useState<string>(selectedStudentId || "");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const getProfileName = (s: StudentOption) => {
    if (!s.profiles) return "";
    if (Array.isArray(s.profiles)) return s.profiles[0]?.full_name || "";
    return s.profiles.full_name || "";
  };

  const getClassName = (s: StudentOption) => {
    if (!s.classes) return "";
    if (Array.isArray(s.classes)) return s.classes[0]?.name || "";
    return s.classes.name || "";
  };

  const getSectionName = (s: StudentOption) => {
    if (!s.sections) return "";
    if (Array.isArray(s.sections)) return s.sections[0]?.name || "";
    return s.sections.name || "";
  };

  // Extract unique class names for quick filtering
  const availableClasses = Array.from(
    new Set(students.map((s) => getClassName(s)).filter(Boolean))
  ).sort();

  const selectedStudent = students.find((s) => s.id === selectedId);

  // Filter students based on search query (Name, Admission No, Father Name) & Class Filter
  const filteredStudents = students.filter((s) => {
    const fullName = getProfileName(s).toLowerCase();
    const admNo = s.admission_number?.toLowerCase() || "";
    const fatherName = s.father_name?.toLowerCase() || "";
    const className = getClassName(s);

    const matchesSearch =
      !searchQuery.trim() ||
      fullName.includes(searchQuery.toLowerCase()) ||
      admNo.includes(searchQuery.toLowerCase()) ||
      fatherName.includes(searchQuery.toLowerCase());

    const matchesClass = !classFilter || className === classFilter;

    return matchesSearch && matchesClass;
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Hidden input for standard HTML form submission */}
      <input type="hidden" name="studentId" value={selectedId} required />

      {/* Select Box Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-ink-200 bg-white p-3.5 text-sm font-medium text-ink-900 shadow-sm transition-all hover:border-gold-400 focus:border-gold-500 focus:outline-none focus:ring-4 focus:ring-gold-500/10"
      >
        {selectedStudent ? (
          <div className="flex items-center gap-2 overflow-hidden text-left">
            <span className="font-semibold text-ink-900">
              {getProfileName(selectedStudent) || "Unnamed Student"}
            </span>
            <span className="font-mono text-xs text-slate-500 font-normal">
              ({selectedStudent.admission_number})
            </span>
            <span className="text-xs text-slate-400 font-normal truncate">
              — {getClassName(selectedStudent)}{" "}
              {getSectionName(selectedStudent) ? `- ${getSectionName(selectedStudent)}` : ""}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 font-normal">
            -- Search & choose active student --
          </span>
        )}

        <div className="flex items-center gap-2">
          {selectedStudent && (
            <Badge variant="default" className="font-mono text-[10px] hidden sm:inline-flex">
              Selected
            </Badge>
          )}
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-ink-200 bg-white p-3 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Controls: Search Bar & Class Filter */}
          <div className="space-y-2 pb-2.5 border-b border-ink-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-3 h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type name (e.g., Amy), admission #..."
                className="w-full rounded-lg border border-ink-200 bg-ink-50/50 pl-9 pr-3 py-2 text-xs font-medium text-ink-900 placeholder:text-slate-400 focus:border-gold-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Class Filter Tabs */}
            {availableClasses.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 max-h-20 overflow-y-auto pt-1">
                <button
                  type="button"
                  onClick={() => setClassFilter("")}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                    !classFilter
                      ? "bg-gold-500 text-white font-semibold"
                      : "bg-ink-100/70 text-slate-600 hover:bg-ink-100"
                  }`}
                >
                  All Classes
                </button>
                {availableClasses.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setClassFilter(cls!)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                      classFilter === cls
                        ? "bg-gold-500 text-white font-semibold"
                        : "bg-ink-100/70 text-slate-600 hover:bg-ink-100"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Student Options List */}
          <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((s) => {
                const isSelected = s.id === selectedId;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelect(s.id)}
                    className={`flex items-center justify-between rounded-lg p-2.5 text-xs cursor-pointer transition ${
                      isSelected
                        ? "bg-gold-50/80 text-gold-900 font-semibold border border-gold-200"
                        : "hover:bg-ink-50 text-ink-800"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-ink-900 text-sm">
                        {getProfileName(s) || "Unnamed Student"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal flex items-center gap-2 mt-0.5">
                        <span className="font-mono bg-ink-100/80 px-1.5 py-0.5 rounded text-ink-700">
                          {s.admission_number}
                        </span>
                        <span>
                          {getClassName(s)} {getSectionName(s) ? `- ${getSectionName(s)}` : ""}
                        </span>
                        {s.father_name && <span>• Father: {s.father_name}</span>}
                      </div>
                    </div>

                    {isSelected && (
                      <svg className="h-4 w-4 text-gold-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No active students match your search filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
