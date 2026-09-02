# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: add-school.spec.js >> Add School page >> loads the page and exposes the section headings
- Location: tests\e2e\add-school.spec.js:47:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel(/email or mobile number/i)

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "404" [level=1] [ref=e4]
    - heading "This page could not be found." [level=2] [ref=e6]
  - alert [ref=e7]
```

# Test source

```ts
  1   | const { test, expect } = require("@playwright/test");
  2   | 
  3   | const email = process.env.E2E_EMAIL;
  4   | const password = process.env.E2E_PASSWORD;
  5   | const organizationId = process.env.E2E_ORGANIZATION_ID;
  6   | const runMutations = process.env.E2E_RUN_MUTATIONS === "1";
  7   | 
  8   | async function signIn(page) {
  9   |   await page.goto("/admin/login");
> 10  |   await page.getByLabel(/email or mobile number/i).fill(email);
      |                                                    ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  11  |   await page.getByLabel(/password/i).fill(password);
  12  |   await page.getByRole("button", { name: /^login$/i }).click();
  13  |   await expect(page).toHaveURL(/dashboard|school-master|select-school/, { timeout: 15_000 });
  14  | }
  15  | 
  16  | async function openAddSchool(page) {
  17  |   await signIn(page);
  18  |   const suffix = organizationId ? `?organization=${organizationId}` : "";
  19  |   await page.goto(`/school-master/new${suffix}`);
  20  |   await expect(page.getByRole("heading", { name: /add school \/ branch/i })).toBeVisible();
  21  | }
  22  | 
  23  | async function fillRequiredFields(page, values = {}) {
  24  |   const data = {
  25  |     name: "Green Valley International School",
  26  |     code: `GVIS-${Date.now()}`,
  27  |     school_type: "Private",
  28  |     contact_person: "Anita Sharma",
  29  |     phone: "9876543210",
  30  |     email: `admin-${Date.now()}@gvis-test.com`,
  31  |     address_line1: "123 Education Road",
  32  |     country: "India",
  33  |     state: "Karnataka",
  34  |     city: "Bengaluru",
  35  |     postal_code: "560001",
  36  |     ...values,
  37  |   };
  38  |   for (const [name, value] of Object.entries(data)) await page.locator(`[name="${name}"]`).fill(value);
  39  | }
  40  | 
  41  | test.describe("Add School page", () => {
  42  |   test.beforeEach(async ({ page }) => {
  43  |     test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated Add School tests.");
  44  |     await openAddSchool(page);
  45  |   });
  46  | 
  47  |   test("loads the page and exposes the section headings", async ({ page }) => {
  48  |     for (const heading of ["Basic Information", "Contact Information", "Address", "Academic Configuration", "System Settings", "Status"]) {
  49  |       await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  50  |     }
  51  |     await expect(page.getByRole("button", { name: /create school/i })).toBeVisible();
  52  |   });
  53  | 
  54  |   test("blocks an empty submission and reports the first required field", async ({ page }) => {
  55  |     await page.getByRole("button", { name: /create school/i }).click();
  56  |     await expect(page.locator("p.text-danger").first()).toContainText(/required/i);
  57  |     await expect(page).toHaveURL(/school-master\/new/);
  58  |   });
  59  | 
  60  |   test("marks all mandatory school fields as required", async ({ page }) => {
  61  |     for (const name of ["name", "code", "school_type", "contact_person", "phone", "email", "address_line1", "country", "state", "city", "postal_code"]) {
  62  |       await expect(page.locator(`[name="${name}"]`)).toHaveAttribute("required", "");
  63  |     }
  64  |   });
  65  | 
  66  |   test("rejects an invalid email before submission", async ({ page }) => {
  67  |     await fillRequiredFields(page, { email: "not-an-email" });
  68  |     await page.getByRole("button", { name: /create school/i }).click();
  69  |     await expect(page.locator("p.text-danger")).toContainText(/valid email/i);
  70  |   });
  71  | 
  72  |   test("rejects a phone number that is not exactly ten digits", async ({ page }) => {
  73  |     await fillRequiredFields(page, { phone: "12345" });
  74  |     await page.getByRole("button", { name: /create school/i }).click();
  75  |     await expect(page.locator("p.text-danger")).toContainText(/10 digits/i);
  76  |   });
  77  | 
  78  |   test("rejects an invalid website while allowing the optional field to remain empty", async ({ page }) => {
  79  |     await fillRequiredFields(page, { website: "not a url" });
  80  |     await page.getByRole("button", { name: /create school/i }).click();
  81  |     await expect(page.locator("p.text-danger")).toContainText(/website url/i);
  82  |   });
  83  | 
  84  |   test("supports the school logo uploader and rejects unsupported files", async ({ page }) => {
  85  |     const logo = page.locator("input[name=logo_file]");
  86  |     await expect(logo).toHaveAttribute("accept", /image\/jpeg/);
  87  |     await logo.setInputFiles({ name: "school-logo.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
  88  |     await fillRequiredFields(page);
  89  |     await page.getByRole("button", { name: /create school/i }).click();
  90  |     await expect(page.locator("p.text-danger")).toContainText(/jpg, png, or webp/i);
  91  |   });
  92  | 
  93  |   test("keeps the organization context fixed when opened from an organization", async ({ page }) => {
  94  |     test.skip(!organizationId, "Set E2E_ORGANIZATION_ID to verify fixed organization context.");
  95  |     await expect(page.locator("input[name=organization_id][type=hidden]")).toHaveValue(organizationId);
  96  |     await expect(page.getByLabel("Organization", { exact: true })).toHaveCount(1);
  97  |   });
  98  | 
  99  |   test("has no horizontal overflow on mobile", async ({ page }) => {
  100 |     await page.setViewportSize({ width: 390, height: 844 });
  101 |     const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  102 |     expect(overflow).toBe(false);
  103 |   });
  104 | 
  105 |   test("has usable layout on desktop", async ({ page }) => {
  106 |     await page.setViewportSize({ width: 1366, height: 768 });
  107 |     await expect(page.getByRole("heading", { name: /add school \/ branch/i })).toBeVisible();
  108 |     await expect(page.getByRole("button", { name: /create school/i })).toBeEnabled();
  109 |   });
  110 | 
```