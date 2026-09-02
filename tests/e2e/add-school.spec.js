const { test, expect } = require("@playwright/test");

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const organizationId = process.env.E2E_ORGANIZATION_ID;
const runMutations = process.env.E2E_RUN_MUTATIONS === "1";

async function signIn(page) {
  await page.goto("/admin/login");
  await page.getByLabel(/email or mobile number/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^login$/i }).click();
  await expect(page).toHaveURL(/dashboard|school-master|select-school/, { timeout: 15_000 });
}

async function openAddSchool(page) {
  await signIn(page);
  const suffix = organizationId ? `?organization=${organizationId}` : "";
  await page.goto(`/school-master/new${suffix}`);
  await expect(page.getByRole("heading", { name: /add school \/ branch/i })).toBeVisible();
}

async function fillRequiredFields(page, values = {}) {
  const data = {
    name: "Green Valley International School",
    code: `GVIS-${Date.now()}`,
    school_type: "Private",
    contact_person: "Anita Sharma",
    phone: "9876543210",
    email: `admin-${Date.now()}@gvis-test.com`,
    address_line1: "123 Education Road",
    country: "India",
    state: "Karnataka",
    city: "Bengaluru",
    postal_code: "560001",
    ...values,
  };
  for (const [name, value] of Object.entries(data)) await page.locator(`[name="${name}"]`).fill(value);
}

test.describe("Add School page", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated Add School tests.");
    await openAddSchool(page);
  });

  test("loads the page and exposes the section headings", async ({ page }) => {
    for (const heading of ["Basic Information", "Contact Information", "Address", "Academic Configuration", "System Settings", "Status"]) {
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /create school/i })).toBeVisible();
  });

  test("blocks an empty submission and reports the first required field", async ({ page }) => {
    await page.getByRole("button", { name: /create school/i }).click();
    await expect(page.locator("p.text-danger").first()).toContainText(/required/i);
    await expect(page).toHaveURL(/school-master\/new/);
  });

  test("marks all mandatory school fields as required", async ({ page }) => {
    for (const name of ["name", "code", "school_type", "contact_person", "phone", "email", "address_line1", "country", "state", "city", "postal_code"]) {
      await expect(page.locator(`[name="${name}"]`)).toHaveAttribute("required", "");
    }
  });

  test("rejects an invalid email before submission", async ({ page }) => {
    await fillRequiredFields(page, { email: "not-an-email" });
    await page.getByRole("button", { name: /create school/i }).click();
    await expect(page.locator("p.text-danger")).toContainText(/valid email/i);
  });

  test("rejects a phone number that is not exactly ten digits", async ({ page }) => {
    await fillRequiredFields(page, { phone: "12345" });
    await page.getByRole("button", { name: /create school/i }).click();
    await expect(page.locator("p.text-danger")).toContainText(/10 digits/i);
  });

  test("rejects an invalid website while allowing the optional field to remain empty", async ({ page }) => {
    await fillRequiredFields(page, { website: "not a url" });
    await page.getByRole("button", { name: /create school/i }).click();
    await expect(page.locator("p.text-danger")).toContainText(/website url/i);
  });

  test("supports the school logo uploader and rejects unsupported files", async ({ page }) => {
    const logo = page.locator("input[name=logo_file]");
    await expect(logo).toHaveAttribute("accept", /image\/jpeg/);
    await logo.setInputFiles({ name: "school-logo.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
    await fillRequiredFields(page);
    await page.getByRole("button", { name: /create school/i }).click();
    await expect(page.locator("p.text-danger")).toContainText(/jpg, png, or webp/i);
  });

  test("keeps the organization context fixed when opened from an organization", async ({ page }) => {
    test.skip(!organizationId, "Set E2E_ORGANIZATION_ID to verify fixed organization context.");
    await expect(page.locator("input[name=organization_id][type=hidden]")).toHaveValue(organizationId);
    await expect(page.getByLabel("Organization", { exact: true })).toHaveCount(1);
  });

  test("has no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  test("has usable layout on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(page.getByRole("heading", { name: /add school \/ branch/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create school/i })).toBeEnabled();
  });

  test("back navigation returns to the organization page", async ({ page }) => {
    test.skip(!organizationId, "Set E2E_ORGANIZATION_ID to verify organization navigation.");
    await page.getByRole("link", { name: /back to organization/i }).click();
    await expect(page).toHaveURL(new RegExp(`/organization-master/${organizationId}$`));
  });

  test("creates a school and allows it to be found in the school list", async ({ page }) => {
    test.skip(!runMutations, "Set E2E_RUN_MUTATIONS=1 to run database mutation tests.");
    const code = `GVIS-${Date.now()}`;
    const name = `Green Valley ${Date.now()}`;
    await fillRequiredFields(page, { name, code });
    await page.getByRole("button", { name: /create school/i }).click();
    await expect(page).toHaveURL(/organization-master\//, { timeout: 15_000 });
    await page.goto("/school-master");
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText(code)).toBeVisible();
  });
});
