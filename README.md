# School Management System — Phases 1-9

Phases 1-8: auth/roles/academic structure, Student Management, Staff Management,
Attendance, Fee Structure Setup, Online Fee Payment, Exams & Results, Reports & Dashboard.
Phase 9: Website CMS, built on top of all of them.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + Storage + Row Level Security)
- Razorpay (payments) + @react-pdf/renderer (PDF) + exceljs (Excel) + recharts (charts)

## Read this first: a critical bug fixed this phase
While building this phase's public pages, I traced through exactly what happens to an unauthenticated request end to end — something I hadn't done since writing the middleware in Phase 1 — and found a serious problem: **the Razorpay webhook has been unreachable since Phase 6.**

The middleware's rule was "redirect to `/login` unless you're signed in, on an auth page, or on the literal path `/`." `/api/webhooks/razorpay` is none of those — and Razorpay's servers, which call that endpoint, never carry a Supabase session cookie. Every real webhook delivery was getting an HTTP redirect to a login page instead of reaching the signature-verification code. **This means no payment made through this app would ever have actually been confirmed**, regardless of how correct the webhook handler's own logic was — it was never running.

`tsc` could not have caught this; it's a routing/logic bug, not a type error. It slipped past Phase 6's review because I checked the webhook handler's own code in isolation and never traced the request path through what sits in front of it. Fixed now: `lib/supabase/middleware.ts` no longer applies the login-redirect to any `/api/*` route at all — API routes are responsible for their own auth response (RLS scoping results to nothing for an anonymous caller, or an explicit 401/403), which is the correct pattern and is what `/api/reports/[type]` already did. Public site pages (new this phase) are handled with an explicit allowlist, so a route not on that list stays protected by default rather than needing to be added to make it protected.

**If you deployed Phases 6-8 before this fix, no online payment during that window was ever actually confirmed server-side**, even if Razorpay itself successfully charged the card — worth checking your Razorpay dashboard against your `payments` table if that applies to you.

## This was built without network access
1. `npm install` in this folder
2. Create a Supabase project, copy `.env.example` to `.env.local`, fill in the Supabase values and (for Phase 6) the `RAZORPAY_*` values
3. Run the SQL migrations in order: `0001` through `0009`
4. `npm run dev`

`tsc --noEmit` stayed clean this phase — no new type errors. That's exactly why the bug above needed a different kind of check (tracing an actual request path) rather than more type-checking; worth remembering for anything else in this codebase that "compiles fine" but has never actually been exercised end to end.

## Bootstrapping the first Super Admin
1. Sign up one user (Supabase dashboard → Authentication → Add user)
2. `update public.profiles set role = 'super_admin' where id = '...';`
3. Sign in. **Set a current academic session** before using Attendance, Fees, or Payments.

## What's built

**Phases 1-8:** see prior notes. Auth/roles, academic structure, Student Management, Staff Management, Attendance, Fee Structure Setup, Online Fee Payment, Exams & Results, Reports & Dashboard.

**Phase 9 — Website CMS**
- **The public site now lives at the root domain.** `/` was the auth-redirect page through Phase 8; it's now the real public homepage, and `app/(site)/` holds every public route (About, Principal's/Chairman's Message, Facilities, Academics, Admissions — one dynamic `[slug]` route rather than six near-identical files — plus Gallery, Events, Notices, and Contact). The header shows "Login" or "Dashboard" depending on whether you're signed in; nothing in the public site requires an account.
- **Genuinely public data, for the first time.** Every table before this phase required a signed-in user, even if only to read. `site_pages`, `site_settings`, `notices` (published ones), `gallery_albums`/`gallery_images`, and `events` all have `using (true)` read policies — no auth check at all. `contact_messages` is the one exception in the other direction: open to insert from anyone, readable only by Super Admin, since a submitted message is correspondence, not content.
- **Notices have a real scheduling mechanism**, not just a date label: `publish_date <= current_date` is enforced in the RLS policy itself, so a notice dated in the future is invisible to everyone but Super Admin until that date arrives — the same principle Phase 4 used for attendance locks and Phase 7 used for exam publishing, applied here to a public-facing table.
- **The dashboard's last placeholder is gone.** "Notices" for staff and students now shows a real count and a "Latest Notices" list, linking out to the public `/notices` page (which means clicking it leaves the dashboard's sidebar shell for the public site's header/footer — a rough edge noted below, not hidden).
- **Storage is public for the first time too**: the `site-media` bucket serves plain public URLs, unlike every previous bucket (student/staff photos, documents), which used short-lived signed URLs. That's intentional — this is marketing content, not records about a specific person, and forcing signed URLs on a public website would be actively wrong.
- **A small `site_settings` table now exists** (school name, contact info, social links) purely so the footer and Contact page aren't empty. It's deliberately minimal — Phase 10 (System Settings) is where this gets a proper admin UI and grows to cover more, and it was built so Phase 10 extends this table rather than needing a schema change to replace it.

## Known gaps / follow-ups worth knowing about
- **No rich text / WYSIWYG editor for page content** — it's a plain textarea, rendered with line breaks preserved (`whitespace-pre-line`). No bold, links, or embedded images within body text. Good enough for a first CMS pass; a real rich-text editor is a meaningfully bigger addition.
- **Clicking "Latest Notices" on the dashboard leaves the dashboard chrome** for the public site's layout, since `/notices` is a public route outside the `(dashboard)` route group. An embedded in-dashboard notices view would be more seamless; not built here.
- **No email notification when a notice is published** — the original plan explicitly marked this optional ("flag it if you want it"), so it wasn't built. Would use Supabase's email integration or a provider like Resend.
- **Gallery images render as a caption placeholder in the admin CMS**, not an actual thumbnail — the admin-side image list shows the caption text in a box rather than the photo itself (the public gallery page does show real images, via public URLs). A quick fix, just not done in this pass.
- **No image cropping/resizing on upload** — whatever file is selected gets stored and served as-is.
- Everything already noted in Phases 2, 3, 6, 7, and 8 (name search, no self-edit UI for staff, no login-email editing, no offline payment recording, no subject deactivation, "Rs." in reports) still applies.

## Security notes
- This phase is the first to introduce intentionally public RLS policies (`using (true)`) — worth being able to tell those apart at a glance from a policy that's *supposed* to require auth but was written wrong. Every public policy in `0008_cms.sql` has a comment explaining why it's public; treat a `using (true)` policy *without* that kind of justification, anywhere else in this codebase, as worth double-checking.
- The middleware fix follows the same "fail safe by default" principle used elsewhere: pages are protected unless explicitly allowlisted (`PUBLIC_PAGE_PATHS`), so a new dashboard route added later stays protected without anyone needing to remember to add it to a list. API routes are the one deliberate blanket exemption, because they're never given HTML redirects, but each one still enforces its own access — nothing here is actually open by accident.

## Project structure
```
app/(site)/                        — public website: layout.tsx (header/footer), page.tsx (home),
                                      [slug]/page.tsx (About/Principal/Chairman/Facilities/Academics/Admissions),
                                      gallery/, events/, notices/, contact/ (form + server action)
app/(dashboard)/cms/                — admin CMS: Pages / Notices / Gallery / Events / Messages / Settings tabs
lib/supabase/middleware.ts          — fixed this phase; see the critical-bug note above
supabase/migrations/                — 0001 through 0009 (0009 adds demo public-site content)
```
(Phases 1-8's structure is unchanged — see prior notes.)

## Coming next
Phase 10 (Admin Settings) — User Management, Role & Permission Management (a proper UI over the Phase 1 permissions catalog), System Settings (grows `site_settings` into something more complete), Backup & Restore guidance, and Activity Logs (the fuller version of the table Phase 4 started for attendance overrides). This is also the last phase in the original plan — say the word and I'll build it.
