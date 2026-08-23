# Admission Enquiry Module – Scope System Architecture

## Current Design (Phase 1)

### Scope Types

The `staff_module_scopes` table supports multiple scope types for admission enquiry management:

| Scope Type | Resource ID | Usage | Current |
|-----------|-------------|-------|---------|
| `ALL` | `null` | Staff can manage all enquiries (admin-level) | ✅ |
| `CLASS` | `class_id` | Staff manages enquiries for specific classes | ✅ |
| `SECTION` | `section_id` | Staff manages enquiries for specific sections | 🔮 Future |
| `OWN_ASSIGNED` | `null` | Staff sees only enquiries assigned to them | ✅ |

### Table Schema

```sql
staff_module_scopes:
  - id (BIGSERIAL PK)
  - staff_id (BIGINT FK → staff.id)
  - module_key (TEXT) = 'admission_enquiry'
  - scope_type (TEXT) ∈ {'ALL', 'CLASS', 'SECTION', 'OWN_ASSIGNED'}
  - resource_id (UUID FK → classes.id OR sections.id, nullable)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  
  UNIQUE INDEX: (staff_id, module_key, scope_type, COALESCE(resource_id::text, ''))
```

## Current Implementation

### Class-Based Scopes

**Example:**
```
Staff A: Admission Staff
  Scope Type: CLASS
  Classes: [Class 1, Class 2, Class 5]
  
Can:
  ✅ View enquiries for Class 1, 2, 5
  ✅ Create enquiries for Class 1, 2, 5
  ✅ Manage follow-ups for Class 1, 2, 5
  ❌ View enquiries for other classes
  ❌ Create enquiries for other classes
```

**Files:**
- Page: `app/(dashboard)/admissions-admin/staff-assignment-rules/page.tsx`
- UI: `app/(dashboard)/admissions-admin/staff-assignment-rules/staff-assignment-rules-table.tsx`
- Server: `lib/enquiries-server.ts:getUserAdmissionScopes()`
- Query: `lib/enquiries-server.ts:getEnquiries()` applies class filters

## Future: Section-Based Scopes

### When to Enable

When section-level assignment tracking is required:
1. A staff member's responsibility narrows to specific sections (e.g., "Class 5 - Section A" only)
2. Enquiry intake distinguishes between sections within the same class
3. Reports/dashboards track performance by section

### How to Add

**1. Database:** Already supported. Insert into `staff_module_scopes`:
```sql
INSERT INTO staff_module_scopes (staff_id, module_key, scope_type, resource_id)
VALUES (
  '...staff_id...',
  'admission_enquiry',
  'SECTION',
  '...section_id...'  -- FK to sections.id
);
```

**2. UI:** Update `staff-assignment-rules-table.tsx`:
```tsx
// Add a toggle or dropdown to choose scope type
const [scopeType, setScopeType] = useState<'CLASS' | 'SECTION'>('CLASS');

// Conditionally render classes or sections
{scopeType === 'CLASS' && <ClassCheckboxGrid />}
{scopeType === 'SECTION' && <SectionCheckboxGrid />}
```

**3. Server:** The helpers already support sections:
```typescript
// getUserAdmissionScopes() returns { classes, sections, ... }
// getEnquiries() already respects both when filtering
```

**4. Enquiry Creation:** Update form to show sections if scope is `SECTION`:
```tsx
if (scope.scopeType === 'SECTION') {
  // Show sections for selected class
} else if (scope.scopeType === 'CLASS') {
  // Show classes only
}
```

## Permission Integration

### Current: Class-Based Permissions

```
super_admin
  ↓
Can assign any staff to any class(es)
↓
Staff can manage enquiries for assigned classes

admission_enquiry.manage_configuration
  ↓
Can manage other staff's designated classes
↓
Staff follows their own scopes
```

### Future: Section-Based Permissions

```
admission_enquiry.manage_configuration (unchanged scope)
  ↓
Can assign staff to specific classes OR sections
↓
No code change needed; same permission key works for both
```

## Key Constraints

1. **No Global Staff Attributes**
   - Admission enquiry scopes are NOT stored on `staff` table
   - Changes to staff roles/timetable assignments do NOT affect enquiry scopes
   - Scopes are independent, module-specific mappings

2. **Server-Side Enforcement**
   - Every API call validates `user → staff → scopes → enquiry.class_id/section_id`
   - Frontend filtering is convenience only; backend checks ALL operations
   - RLS policies (optional) provide defense-in-depth

3. **Audit Logging**
   - All scope changes recorded in access logs via `recordServerAction()`
   - Scope history not tracked (scopes are current state); use activity logs for enquiry changes

## Testing

See `tests/staff-scopes.test.ts` for:
- Class-based scope enforcement
- Multi-class assignments
- Permission validation
- Edge cases (all/none/mixed scopes)

Section-based tests can be added when the feature is implemented.

## References

- **Admission Enquiry Module**: Tracks prospective students from enquiry → follow-up → outcome
- **Staff Management**: `/admissions-admin/staff-assignment-rules` UI
- **Enquiry Helpers**: `lib/enquiries-server.ts` + `lib/enquiries.ts`
- **Server Actions**: `app/(dashboard)/staff/actions.ts:setStaffModuleScopes()`
