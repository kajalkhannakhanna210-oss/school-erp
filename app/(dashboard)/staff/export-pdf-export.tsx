"use client";

import dynamic from "next/dynamic";

export const ExportPdfButton = dynamic(
  () => import("./export-pdf-button").then((module) => module.ExportPdfButton),
  { ssr: false },
);
