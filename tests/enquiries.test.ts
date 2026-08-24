import test from "node:test";
import assert from "node:assert/strict";
import {
  ENQUIRY_STATUSES,
  ENQUIRY_TYPES,
  FOLLOWUP_TYPES,
  ENQUIRY_SOURCES,
  isValidEnquiryTransition,
  getUserActionScope,
  canPerformEnquiryAction,
} from "../lib/enquiries";

test("Admission Enquiry - Valid Workflow Transitions", () => {
  assert.equal(isValidEnquiryTransition("New", "Assigned"), true);
  assert.equal(isValidEnquiryTransition("Assigned", "Follow-up"), true);
  assert.equal(isValidEnquiryTransition("Follow-up", "Interested"), true);
  assert.equal(isValidEnquiryTransition("Interested", "Won"), true);
  assert.equal(isValidEnquiryTransition("Interested", "Lost"), true);
  assert.equal(isValidEnquiryTransition("New", "Closed"), true);
});

test("Admission Enquiry - Invalid Workflow Transitions", () => {
  assert.equal(isValidEnquiryTransition("Won", "New"), false);
  assert.equal(isValidEnquiryTransition("Won", "Assigned"), false);
});

test("Admission Enquiry - Constants & Enums", () => {
  assert.ok(ENQUIRY_STATUSES.includes("New"));
  assert.ok(ENQUIRY_STATUSES.includes("Won"));
  assert.ok(ENQUIRY_STATUSES.includes("Lost"));

  assert.ok(ENQUIRY_TYPES.includes("Online"));
  assert.ok(ENQUIRY_TYPES.includes("Offline"));

  assert.ok(FOLLOWUP_TYPES.includes("Phone"));
  assert.ok(FOLLOWUP_TYPES.includes("WhatsApp"));
  assert.ok(FOLLOWUP_TYPES.includes("Visit"));

  assert.ok(ENQUIRY_SOURCES.includes("Walk-in"));
  assert.ok(ENQUIRY_SOURCES.includes("Website"));
  assert.ok(ENQUIRY_SOURCES.includes("Referral"));
});

// Mock Supabase client generator for Action Scope scenarios
function createMockSupabase(config: {
  role?: string;
  permissions?: string[];
  scopes?: Array<{ action_key: string; scope_type: string; resource_id?: string | null }>;
}) {
  const role = config.role ?? "staff";
  const perms = config.permissions ?? [];
  const scopes = config.scopes ?? [];

  return {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role } }),
              single: async () => ({ data: { role } }),
            }),
          }),
        };
      }
      if (table === "staff_permissions") {
        return {
          select: () => ({
            eq: (col1: string, val1: any) => ({
              eq: (col2: string, permKey: any) => {
                const found = perms.includes(permKey);
                const result = { data: found ? { permission_key: permKey } : null };
                return {
                  maybeSingle: async () => result,
                  single: async () => result,
                  then: (cb: any) => Promise.resolve(result).then(cb),
                };
              },
            }),
          }),
        };
      }
      if (table === "staff_module_scopes") {
        return {
          select: () => ({
            eq: (col1: string, val1: any) => {
              const res = { data: scopes };
              return {
                eq: async (col2: string, val2: any) => res,
                maybeSingle: async () => res,
                then: (cb: any) => Promise.resolve(res).then(cb),
              };
            },
          }),
        };
      }
      return {};
    },
    auth: {
      getUser: async () => ({ data: { user: { id: "user-123" } } }),
    },
  } as any;
}

test("Scenario 1: Independent Create vs Follow-up Scopes", async () => {
  // Staff A: Create: Class 1 (c1), Follow-up: Class 5 (c5)
  const mockClient = createMockSupabase({
    role: "staff",
    permissions: ["admission_enquiry.create", "admission_enquiry.followup"],
    scopes: [
      { action_key: "create", scope_type: "CLASS", resource_id: "c1" },
      { action_key: "followup", scope_type: "CLASS", resource_id: "c5" },
    ],
  });

  // Can create Class 1
  const canCreateC1 = await canPerformEnquiryAction(mockClient, "staff-A", "create", "c1");
  assert.equal(canCreateC1.allowed, true);

  // Cannot create Class 5
  const canCreateC5 = await canPerformEnquiryAction(mockClient, "staff-A", "create", "c5");
  assert.equal(canCreateC5.allowed, false);

  // Can follow up Class 5
  const canFollowC5 = await canPerformEnquiryAction(mockClient, "staff-A", "followup", "c5");
  assert.equal(canFollowC5.allowed, true);

  // Cannot follow up Class 6
  const canFollowC6 = await canPerformEnquiryAction(mockClient, "staff-A", "followup", "c6");
  assert.equal(canFollowC6.allowed, false);
});

test("Scenario 2: Scopes Remain Completely Independent across Actions", async () => {
  // Staff B: Create Class 1-5, Follow-up Class 6-10
  const mockClient = createMockSupabase({
    role: "staff",
    permissions: ["admission_enquiry.create", "admission_enquiry.followup"],
    scopes: [
      { action_key: "create", scope_type: "CLASS", resource_id: "c1" },
      { action_key: "create", scope_type: "CLASS", resource_id: "c2" },
      { action_key: "create", scope_type: "CLASS", resource_id: "c3" },
      { action_key: "create", scope_type: "CLASS", resource_id: "c4" },
      { action_key: "create", scope_type: "CLASS", resource_id: "c5" },
      { action_key: "followup", scope_type: "CLASS", resource_id: "c6" },
      { action_key: "followup", scope_type: "CLASS", resource_id: "c7" },
      { action_key: "followup", scope_type: "CLASS", resource_id: "c8" },
      { action_key: "followup", scope_type: "CLASS", resource_id: "c9" },
      { action_key: "followup", scope_type: "CLASS", resource_id: "c10" },
    ],
  });

  const createRes = await canPerformEnquiryAction(mockClient, "staff-B", "create", "c3");
  assert.equal(createRes.allowed, true);

  const followCreateRes = await canPerformEnquiryAction(mockClient, "staff-B", "followup", "c3");
  assert.equal(followCreateRes.allowed, false);

  const followRes = await canPerformEnquiryAction(mockClient, "staff-B", "followup", "c8");
  assert.equal(followRes.allowed, true);

  const createFollowRes = await canPerformEnquiryAction(mockClient, "staff-B", "create", "c8");
  assert.equal(createFollowRes.allowed, false);
});

test("Scenario 3: Coordinator Assign permission without Follow-up", async () => {
  // Staff C: Assign: Class 1-10, Follow-up: None
  const mockClient = createMockSupabase({
    role: "staff",
    permissions: ["admission_enquiry.assign"],
    scopes: [
      { action_key: "assign", scope_type: "ALL" },
    ],
  });

  const canAssign = await canPerformEnquiryAction(mockClient, "staff-C", "assign", "c5");
  assert.equal(canAssign.allowed, true);

  const canFollow = await canPerformEnquiryAction(mockClient, "staff-C", "followup", "c5");
  assert.equal(canFollow.allowed, false);
});

test("Scenario 4: User configured with same class for Create & Follow-up", async () => {
  const mockClient = createMockSupabase({
    role: "staff",
    permissions: ["admission_enquiry.create", "admission_enquiry.followup"],
    scopes: [
      { action_key: "create", scope_type: "CLASS", resource_id: "c1" },
      { action_key: "followup", scope_type: "CLASS", resource_id: "c1" },
    ],
  });

  const canCreate = await canPerformEnquiryAction(mockClient, "staff-D", "create", "c1");
  const canFollow = await canPerformEnquiryAction(mockClient, "staff-D", "followup", "c1");

  assert.equal(canCreate.allowed, true);
  assert.equal(canFollow.allowed, true);
});

test("Scenario 5: View Class 1-10, Edit Class 1, Follow-up Class 5", async () => {
  const mockClient = createMockSupabase({
    role: "staff",
    permissions: ["admission_enquiry.view", "admission_enquiry.edit", "admission_enquiry.followup"],
    scopes: [
      { action_key: "view", scope_type: "ALL" },
      { action_key: "edit", scope_type: "CLASS", resource_id: "c1" },
      { action_key: "followup", scope_type: "CLASS", resource_id: "c5" },
    ],
  });

  // View Class 5 -> Yes
  const canViewC5 = await canPerformEnquiryAction(mockClient, "staff-E", "view", "c5");
  assert.equal(canViewC5.allowed, true);

  // Follow-up Class 5 -> Yes
  const canFollowC5 = await canPerformEnquiryAction(mockClient, "staff-E", "followup", "c5");
  assert.equal(canFollowC5.allowed, true);

  // Edit Class 5 -> No
  const canEditC5 = await canPerformEnquiryAction(mockClient, "staff-E", "edit", "c5");
  assert.equal(canEditC5.allowed, false);
});

test("Scenario 6: API parameter bypass prevention", async () => {
  // Staff without permission/scope trying to access unauthorized class
  const mockClient = createMockSupabase({
    role: "staff",
    permissions: ["admission_enquiry.create"],
    scopes: [{ action_key: "create", scope_type: "CLASS", resource_id: "c1" }],
  });

  // Malicious class_id override attempt
  const res = await canPerformEnquiryAction(mockClient, "hacker", "create", "c99");
  assert.equal(res.allowed, false);
});
