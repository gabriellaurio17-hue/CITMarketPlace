# CIT Marketplace

A campus marketplace prototype for Cebu Institute of Technology (CIT) students, faculty, and staff. The project is intended to help the campus community discover, sell, and rent academic and personal items. Payments and item handoffs are arranged offline by cash and in-person meetup; the app does not process payments or delivery.

> **Project status:** Supabase Auth, marketplace data, and admin workflows are implemented in the frontend and initial SQL migration. The migration still needs to be run in your Supabase project before these workflows can work. Never rely on client-side UI checks alone; database RLS and functions enforce access rules.

## Contents

- [Current features](#current-features)
- [Technology](#technology)
- [Run locally](#run-locally)
- [Connect a Supabase project](#connect-a-supabase-project)
- [Create test accounts](#create-test-accounts)
- [Planned Supabase data model](#planned-supabase-data-model)
- [Project structure](#project-structure)
- [Routes](#routes)
- [Development status and next steps](#development-status-and-next-steps)
- [Team notes](#team-notes)

## Current features

The app currently includes:

- A landing page and sample marketplace listings.
- Browse search, category/type/condition/price filters, and price sorting.
- Listing detail pages, including a rental duration and estimated price display.
- Supabase email/password signup and login, profile loading, logout, and route protection.
- Database-backed public browse/detail pages and listing creation/editing with photo upload and pending approval.
- A user dashboard, listing availability/deletion controls, conversations with realtime messages, rental recording/return, notifications, reports, seller reviews, and an admin moderation screen.
- Responsive styling and shared navigation components.

The database workflows require the SQL migration below. Until it has been run, the app cannot find the marketplace tables.

## Technology

- React 19
- React Router 6
- Create React App (`react-scripts`)
- Plain CSS
- Supabase JavaScript client (`@supabase/supabase-js`) is installed and initialized in `src/lib/supabaseClient.js`.
- Local Supabase connection values belong in the ignored `.env.local` file; each developer must configure their own values.

The design document mentions React + Vite. The repository currently uses Create React App. Until the team migrates to Vite, use `REACT_APP_` environment variable names, not Vite's `VITE_` names.

## Run locally

### Requirements

- Node.js and npm
- Git

### Setup

```bash
git clone <repository-url>
cd my-app
npm install
cp .env.example .env.local
# Fill in your Supabase URL/key in .env.local before starting
npm start
```

The development server opens at [http://localhost:3000](http://localhost:3000).

Available scripts:

```bash
npm start       # Run the development server
npm test        # Run the Create React App test runner
npm run build   # Create a production build in build/
```

## Connect a Supabase project

These steps configure the frontend to connect to a Supabase project. They do not, by themselves, implement the app's authentication, database queries, access rules, or feature workflows.

### 1. Create the Supabase project

Create a project in the Supabase dashboard. Choose a region close to the expected users. Keep the database password in a password manager; it is not the same as an application API key.

### 2. Get the client connection values

In the Supabase dashboard, open the project's **Connect** panel (or API settings) and copy:

- The **Project URL**.
- The **Publishable key** (or legacy `anon` key, if that is what the project exposes).

The URL and publishable/anon key are intended for browser clients. They do not grant unrestricted access when database tables have correct Row Level Security (RLS) policies. **Never put a Supabase secret key or legacy `service_role` key in this React app.** Those keys bypass RLS and must remain in a trusted server environment.

### 3. Install the Supabase JavaScript client

From the project root:

```bash
npm install @supabase/supabase-js
```

Commit the resulting `package.json` and lockfile changes with the integration work.

### 4. Add local environment variables

Copy `.env.example` to `.env.local` in the repository root (beside `package.json`):

```bash
cp .env.example .env.local
```

On PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

Fill in the local file with your Supabase **Project URL** and **Publishable key**:

```dotenv
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Replace the example values with the ones from your Supabase project. `.env.local` is ignored by Git in this repository; **do not commit real credentials**. Create React App reads variables prefixed with `REACT_APP_`. Restart `npm start` after changing environment variables.

For deployment, add the same variable names and values to the hosting provider's environment-variable settings. Do not copy `.env.local` into GitHub.

### 5. Create the shared Supabase client

Create `src/lib/supabaseClient.js`:

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabasePublishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
```

Import this one client from feature/service modules instead of creating a new client in each page. This keeps Auth session handling shared across the app.

### 6. Configure Auth for the campus flow

In Supabase **Authentication** settings:

1. Enable email signups and email confirmation.
2. Set the local Site URL to `http://localhost:3000` while developing.
3. Add the local callback/redirect URLs used by the app (for example, `http://localhost:3000/**`) to the allowed redirect URLs. Add the production domain when deployed.
4. Keep confirmation enabled so a user is not considered verified merely because the address ends in `@cit.edu`.

The current `isCitEmail` helper checks only the address format/domain. Supabase email confirmation proves mailbox access; the app and database must still enforce the project rule that only verified `@cit.edu` accounts with active status can create listings or send messages.

### 7. Design the database and security before wiring pages

Use Supabase SQL migrations (or versioned SQL files in the repository) so teammates can recreate the schema. The design document calls for profiles, categories, listings and images, conversations and messages, transactions, reviews, reports, notifications, and moderation logs; a suggested starting schema is in [Planned Supabase data model](#planned-supabase-data-model).

For every exposed table:

- Enable RLS and write policies for each operation. Enabling RLS without policies blocks client access; broad policies can expose or alter other users' data.
- Enforce ownership and role checks in policies or trusted database functions, not just by hiding UI buttons.
- Ensure public browse queries return only listings that are approved and active.
- Keep moderation status changes limited to admins and write the moderation log as part of the same trusted operation.
- Test policies with separate user accounts and an admin account before deploying.

The migration creates a private `listing-images` Storage bucket with JPG/PNG and 10 MB limits plus owner and listing-visibility policies. The app creates signed image URLs for approved listings. Keep this bucket private so pending listing photos are not public.

### 7. Create the marketplace schema

The repository includes the initial schema and Row Level Security policies at `supabase/migrations/202611100001_initial_marketplace.sql`. In Supabase, open **SQL Editor → New query**, paste the complete file contents, and run the query. This creates profiles, listings, messages, transactions, reports, notifications, moderation functions, categories, and the `listing-images` Storage bucket. Your Supabase project currently has only the connection test table, so this migration is required before marketplace pages can load.

The account role is `user` or `admin`; Student and Faculty/Staff are profile classifications. If you already ran the earlier migrations, run `supabase/migrations/202611100003_user_admin_roles.sql` and then `supabase/migrations/202611100004_restore_member_classification.sql` in the SQL Editor. Public signup creates only `user` accounts. Choosing Admin in signup is blocked; an existing project owner must grant admin access.

Apply migrations `001`–`007` in numeric order on a fresh database. On an existing database, apply each migration after the latest one already run. Migration `006` adds the admin account-decline action; migration `007` provides a safe listing-owner display name for public listing cards and details.

### 8. Create the first administrator

1. Start the app and sign up with an accessible `@cit.edu` email for the admin account.
2. Confirm that email from the inbox.
3. In the Supabase SQL Editor, promote that confirmed account (replace the example email):

   ```sql
   update public.profiles
   set role = 'admin', is_verified = true
   where email = lower('admin@cit.edu');
   ```

4. Log out and back in. Admins can use the four admin links in the header; the public homepage remains available to all account types.

Promote the first admin only through the Supabase SQL Editor. Public signup creates only regular `user` accounts; admins are assigned by an existing project owner through SQL. The app does not provide a role-switcher or a way for users to grant themselves admin access. Buyer, seller, and renter are activities available to users, not account roles.

### 9. Configure email redirects

In Supabase Authentication URL settings, set the local Site URL to `http://localhost:3000` and add that local URL to allowed redirects. Add the production domain before deployment. Keep email confirmation enabled.

The app enforces email confirmation and admin profile verification before listing or messaging. Signup’s `@cit.edu` check alone does not verify mailbox ownership.

## Create test accounts

Use **four separate Supabase Auth accounts** to preview the main views:

1. Admin account: the account you promoted in the SQL Editor.
2. Student account A: verify it in Admin, then use it to create listings.
3. Student account B: verify it in Admin, then use it as a buyer/renter.
4. Another User account (a student, faculty, or staff member) and verify it in Admin.

Use inboxes you can access for email confirmation. To switch between accounts, log out and log back in with the other account. There is no in-app identity/role switcher. All regular Users share the member interface; the admin role opens the separate moderation screen. Buying, selling, renting, and owning are activities available to regular members, not separate access roles.

## Planned Supabase data model

The migration implements these entities from the CIT Marketplace software design. The tables exist in Supabase only after the migration has been run.

| Table | Purpose / key fields |
| --- | --- |
| `profiles` | Auth user ID, full name, email, role (`user` or `admin`), optional campus classification, account status, verification state, creation date |
| `categories` | Category ID and name |
| `listings` | Owner, category, title, description, condition, type, price, rental terms/deposit, location, approval status, availability, posted date |
| `listing_images` | Listing ID, storage path, display order |
| `conversations` | Listing ID, buyer/renter ID, seller/owner ID |
| `messages` | Conversation ID, sender ID, content, timestamp, read timestamp |
| `transactions` | Listing, parties, sale/rental type, status, start/end dates, deposit amount/status, completion date |
| `reviews` | Completed transaction, reviewer, seller/owner, 1–5 rating, comment, date |
| `reports` | Reporter, target type and ID, reason, status, submission date |
| `notifications` | User, type, message, related record, read state, date |
| `moderation_logs` | Admin, action, target, note, date |

Use Supabase Auth's user ID as the profile primary key. Define foreign keys, uniqueness rules, indexes, and RLS policies in migrations. The exact policies and constraints should be reviewed by the team before enabling real users.

## Project structure

```text
src/
  components/   Shared layout, navigation, branding, and listing UI
  data/         Demo listings and sample dashboard/activity data
  hooks/        Listing filter hook
  pages/        Route-level screens
  utils/        Validation and currency formatting helpers
  index.css     Global styles and responsive page/component styles
  index.js      App entry point, lazy-loaded routes, and router
public/
  images/       Static image assets used by the interface
```

`src/auth/` contains session/profile state. `src/lib/` contains the shared Supabase client. The migration is version-controlled in `supabase/migrations/`.

## Routes

| Path | Screen |
| --- | --- |
| `/` | Home |
| `/browse` | Browse and filter listings |
| `/items/:id` | Listing details |
| `/sell` | Listing form |
| `/sell/mobile` | Mobile listing concept flow |
| `/dashboard` | User dashboard |
| `/rentals` | Rental tracking screen |
| `/messages` | Messaging screen |
| `/notifications` | Notifications screen |
| `/admin/pending-listings` | Pending listing review (admin only) |
| `/admin/verify-accounts` | Account verification queue (admin only) |
| `/admin/reports` | Report review (admin only) |
| `/admin/moderation-log` | Moderation history (admin only) |
| `/login` | Login screen |
| `/signup` | Signup screen |

## Development status and next steps

### Implemented in the app

- Supabase Auth signup/login, profile loading, sign out, and role-gated routes.
- Listings, photo upload, browse filters, listing management, reports, and admin approval.
- Listing-linked messaging, realtime message/notification updates, rental records, return completion, and seller reviews.
- Student/Faculty/Staff user classifications, User/Admin roles, and admin-only moderation views.

### Setup and remaining work

- Run the initial migration in your Supabase project's SQL Editor.
- Create and confirm test accounts, promote the first admin, and verify regular accounts from the admin screen.
- Check and refine the migration and RLS policies against the team’s grading/deployment requirements before production use.
- Complete any additional sale completion or profile-management details required by the team.
- Automated tests for the database policies and full account workflows.

## Team notes

- The attached software design describes the intended requirements and architecture; it is not proof that a feature is implemented.
- Never commit `.env.local`, Supabase secret keys, user credentials, or real personal data.
- Use sample/test accounts and a non-production Supabase project while developing.
- Make database schema and policy changes reproducible through reviewed migrations.
- Use separate Auth accounts to preview the real views: regular User accounts and an administrator. All Users share the member UI; buying, selling, and renting are actions, not separate roles.

## References

- [Supabase React Auth quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Supabase security production checklist](https://supabase.com/docs/guides/security/production-checklist)
- [Supabase JavaScript client initialization](https://supabase.com/docs/reference/javascript/initializing)
