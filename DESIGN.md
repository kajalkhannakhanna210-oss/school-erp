# Design tokens (carry these into every later phase)

**Palette**
- `ink` (#1E2A4A) — primary, navigation, headings
- `gold` (#C99A3B) — accent, current-session badges, focus rings
- `paper` (#FAF9F6) — page background
- `slate` (#2B2E33) — body text
- `success` (#3E8E5B), `danger` (#C4483C)

**Type**
- Display: Fraunces (serif) — page titles, section headers
- Body/UI: Inter — everything else
- Mono: IBM Plex Mono — IDs, admission/employee/receipt numbers, dates in tables (the "ledger" numbers)

**Signature idea**
The system is framed as a registrar's ledger — reflected in the auth screen copy and the consistent use of monospace for record identifiers throughout. Keep that thread going: admission numbers, employee IDs, and receipt numbers should always render in `font-mono`.

**Components**
Shared primitives live in `components/ui.tsx` (Button, Input, Label, Card, Badge), `components/toaster.tsx` (toast notifications), and `components/confirm-dialog.tsx` (delete confirmations). Reuse these rather than creating new one-off variants per phase.
