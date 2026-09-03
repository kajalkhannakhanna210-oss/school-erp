import type { ReactNode } from "react";
import AuthLayout from "@/app/(auth)/layout";
export default function OrganisationLayout({ children }: { children: ReactNode }) { return <AuthLayout>{children}</AuthLayout>; }
