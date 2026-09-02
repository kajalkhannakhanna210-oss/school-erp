import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*([^#\r\n]*)/)).filter(Boolean).map((match) => [match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await admin.auth.admin.updateUserById("c6a7a53d-4970-47a9-bd0c-6e57ebf5925d", { password: "kajalkhanna1!" });
if (error || !data.user) throw new Error(error?.message ?? "Password update failed.");
console.log("Password reset through Supabase Admin SDK.");
