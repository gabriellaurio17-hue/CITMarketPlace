# CIT Marketplace

Campus-exclusive marketplace where verified CIT students, faculty, and staff buy, sell, and rent academic and personal items. Built with React 19, React Router DOM 6, Supabase, and localStorage fallback for demo mode.

## Tech Stack

- **Frontend:** React 19, React Router DOM 6, Create React App (react-scripts 5.0.1)
- **Backend:** Supabase (Auth, Database, Storage) with localStorage fallback
- **Styling:** Custom CSS with maroon/gold CIT branding
- **Testing:** 20 accessibility and registration tests

## Run Locally

```sh
npm install
npm start
```

Create React App opens the app at `http://localhost:3000`. To make a production build, run `npm run build`.

## Supabase Setup

1. Copy `.env.example` to `.env.local` and set:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

2. Run all SQL files in `supabase/migrations/` in filename order in the Supabase SQL Editor:
   ```
   20261126000000_marketplace_full_database.sql
   20261126183000_secure_profile_access.sql
   20261126190000_fix_moderation_log_admin_column.sql
   20261126192000_allow_moderation_action_labels.sql
   20261126213000_fix_moderation_log_target_type_constraint.sql
   20261126214000_add_conversation_participant_columns.sql
   20261126215000_fix_missing_profile_classification.sql
   20261126220500_align_transaction_deposit_status_constraint.sql
   20261126220800_align_transaction_status_constraint.sql
   20261126221000_ensure_conversation_uniqueness.sql
   20261126224000_enable_seller_review_visibility.sql
   20261128144500_add_owner_id_to_reports.sql
   ```

3. Set email confirmation and site redirect URLs in Supabase Authentication settings.

4. Promote an admin account using its exact email:
   ```sql
   update public.profiles
   set role = 'admin',
       classification = 'Admin',
       is_verified = true,
       verification_status = 'approved',
       account_status = 'active'
   where email = 'admin@cit.edu';
   ```

5. Test signup, email confirmation, account approval, listing create/edit/approval, photo upload, search, rentals, chat notifications, reports, and moderation logs.

## Demo Mode

When Supabase environment variables are not configured, the app falls back to browser `localStorage`. Demo accounts:

| Role | Username | Email |
|------|----------|-------|
| Member | `ana` | `ana.reyes@cit.edu` |
| Member | `marco` | `marco.dc@cit.edu` |
| Member | `bea` | `bea.santos@cit.edu` |
| Administrator | `admin` | `admin@cit.edu` |

Demo authentication is not secure. Uploaded listing photos are not persisted in demo mode. Clear demo data by removing the `cit-marketplace-demo-v1` localStorage key.

## User Roles & Tasks

| Role | Capabilities |
|------|-------------|
| **Student / Faculty / Staff** | Browse/search listings, post listings, rent items, chat with sellers/buyers, track rentals, rate sellers, view notifications |
| **Admin** | Approve/reject/delete pending listings, verify/decline accounts, resolve/dismiss reports with actions (delete item, delete user, warn user), export moderation log |

## Screens

| Screen | Purpose |
|--------|---------|
| Home | Campus hero, featured listings |
| Browse | Search, filter, paginate listings |
| ItemDetails | View listing, submit purchase/rental request, back navigation |
| Sell | Create listing (essentials + photos with preview) |
| SellMobile | Mobile color preview flow |
| Rentals | Submit/approve/reject/return/complete rentals |
| Messages | Campus chat with notifications |
| Dashboard | My listings (edit/mark unavailable/delete), sales, reviews |
| Notifications | Activity feed with mark-as-read |
| Admin | Pending listings, account verification, open reports, moderation log |

## Accessibility (WCAG 2.1)

- `aria-hidden` on decorative characters (`↗`, `＋`, `★`)
- `aria-label` on icon buttons (send message, pagination, close)
- `disabled` on empty select options
- Focus rings and disabled button contrast
- `role="status"` for confirmations, `role="alert"` for errors
- Floating toast notifications with auto-dismiss and manual dismiss
- All 20 accessibility and registration tests pass

## Brand

Maroon and gold CIT theme. Colors and fonts are preserved across all screens — no redesign from scratch.

## Safety Rules

- Styling, markup, accessibility attributes, and UI text changes only
- No changes to business logic, Supabase queries, routes, auth, or data files (`src/data/`, `src/lib/`, `src/auth/`, `supabase/migrations/`)
- No SRS-required fields or features removed
- No new dependencies; no file renames or deletions
- Tests must pass after every change
