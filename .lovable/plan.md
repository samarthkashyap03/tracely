## Job Tracker — Build Plan

A premium, minimal job-application tracker with email/password + Google auth, a fast table-first UI, and customizable dropdown options (platform, status, role, work type).

### Auth & Backend (Lovable Cloud) 0- dont use lovable cloud, i will host it on vercel, so it must be independant of lovable, use only supabase, i will creatrev a DB in supabase for storage

- Enable Lovable Cloud.
- Auth: email/password + Google sign-in. `/login`, `/signup`, `/reset-password`, `/forgot-password` pages.
- Protected app behind `_authenticated` layout route.
- `onAuthStateChange` listener at root for cache invalidation.

### Database (Supabase via Lovable Cloud)

- `profiles` — id (FK auth.users), display_name, avatar_url, created_at. Auto-created via trigger on signup.
- `job_applications`
  - id, user_id, company_name, applied_at (default now()), status, platform, work_type, role, notes, url, salary (optional), location (optional), updated_at.
- `user_options` — id, user_id, category (`status` | `platform` | `work_type` | `role`), value. Lets each user add/edit/remove their own dropdown options.
- Seed default options per user on first load (Applied, Under Process, Interview, Offer, Rejected / LinkedIn, Indeed, Stepstone, Wellfound, Company Site / Remote, Hybrid, Onsite / SWE, Gen AI, Data, PM, Design).
- RLS: every table scoped to `auth.uid() = user_id`.

### Pages / Routes

- `/` — marketing landing (hero, features, CTA → sign up).
- `/login`, `/signup`, `/forgot-password`, `/reset-password`.
- `/_authenticated/dashboard` — main tracker (table + stats).
- `/_authenticated/settings` — manage custom options (add/edit/delete platform, status, role, work type) and profile.

### Dashboard UI (table-first, low cognitive load)

- Top bar: search, status filter chips, platform filter, "+ Add Application" primary button.
- Compact stat cards: Total, Active (Applied + Under Process), Interviews, Offers, Rejected.
- Data table (shadcn `Table` + TanStack Table):
  - Columns: Company, Role, Status (color badge), Platform, Work Type, Applied (relative date), Actions.
  - Sortable headers, column visibility toggle, pagination, sticky header.
  - Inline edit via row → side `Sheet` for full edit form.
  - Row actions: Edit, Duplicate, Delete (with confirm `AlertDialog`).
- Add/Edit form in a `Sheet`:
  - Fields: Company (text), Role (combobox from user_options + free type), Status (select), Platform (combobox), Work Type (select), URL, Location, Salary, Notes.
  - `applied_at` auto-set to `now()` on create; editable via date picker.
  - Each combobox has "+ Add new…" inline → writes to `user_options`.
- Empty state with illustration + "Add your first application" CTA.
- Toasts (sonner) on every mutation.

### Settings — custom options manager

- Tabs: Statuses · Platforms · Roles · Work Types.
- Each tab: list with edit/delete + add-new input. Optimistic updates.
- Profile tab: display name, avatar, sign out, delete account (later).

### Design system (premium, minimal)

- Dark-default theme with light toggle. Deep neutral background, single accent.
- Semantic tokens in `src/styles.css` (oklch). Status badge colors mapped to tokens.
- Typography: Inter / Geist-style sans, tight tracking on headings.
- Generous spacing, subtle borders, soft shadows, no gradients-for-the-sake-of.
- Motion: subtle row hover, sheet slide, fade on mount only.

### Tech notes

Use react, tailwind CSS, shadcn UI, supabase, typescript

- TanStack Start + TanStack Query. Reads via `createServerFn` + `requireSupabaseAuth`, mutations via `useServerFn` + `useMutation` with cache invalidation.
- Zod validation on all inputs (client + server fn).
- `@tanstack/react-table` for the table.
- SEO metadata + JSON-LD on landing; protected routes noindex.

### Out of scope (v1)

- File attachments (resume per app), reminders/emails, Kanban board view, CSV import/export, analytics charts — easy to add later.

Want me to add any of the out-of-scope items into v1 before I build?