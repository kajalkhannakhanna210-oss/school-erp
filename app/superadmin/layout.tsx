import type { ReactNode } from "react";
import AuthLayout from "@/app/(auth)/layout";
export default function SuperAdminLayout({ children }: { children: ReactNode }) { return <AuthLayout>{children}</AuthLayout>; }
