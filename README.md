# CIT Marketplace

A campus marketplace prototype for Cebu Institute of Technology (CIT) students, faculty, and staff. The project is intended to help the campus community discover, sell, and rent academic and personal items. Payments and item handoffs are arranged offline by cash and in-person meetup; the app does not process payments or delivery.

> **Project status:** This repository currently contains a React frontend prototype with sample data. Supabase has not yet been connected. Authentication, listing persistence, messaging, moderation, and other workflows described in the design are not implemented as live services yet. Do not use the current UI as an access-control or security boundary.

## Contents

- [Current features](#current-features)
- [Technology](#technology)
- [Run locally](#run-locally)
- [Connect a Supabase project](#connect-a-supabase-project)
- [Planned Supabase data model](#planned-supabase-data-model)
- [Project structure](#project-structure)
- [Routes](#routes)
- [Development status and next steps](#development-status-and-next-steps)
- [Team notes](#team-notes)

## Current features

The current app includes:

- A landing page and sample marketplace listings.
- Browse search, category/type/condition/price filters, and price sorting.
- Listing detail pages, including a rental duration and estimated price display.
- Login and signup screens with basic client-side form validation and a `@cit.edu` email format check.
- A listing form, mobile listing concept screen, dashboard, messages, notifications, and rental tracking screens populated with demo data.
- Responsive styling and shared navigation components.

Most actions are presentation-only. For example, login does not authenticate a user, the listing form does not save a listing, and messages and rental changes do not persist after leaving the page.

## Technology

- React 19
- React Router 6
- Create React App (`react-scripts`)
- Plain CSS
- Supabase is the planned backend, but is not currently installed or configured in this repository.

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

Create `.env.local` in the repository root (beside `package.json`):

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

For listing photos, create a Storage bucket and decide whether listing images are public or private. Add Storage policies for upload, viewing, and deletion that check the authenticated owner and listing visibility. Do not rely on client-side file checks alone.

### 8. Integrate the app in small steps

Recommended order:

1. Add an Auth provider/context that loads the current Supabase session, subscribes to auth state changes, and exposes sign-up, sign-in, and sign-out actions.
2. Replace the simulated login/signup success flows with Supabase Auth calls and confirmation handling.
3. Add a profile record for each Auth user and route protection for signed-in and admin-only pages.
4. Create listing service functions for insert, update, availability, deletion, and search. Replace sample listing reads and make form submission upload images and save a pending listing.
5. Add the admin moderation flow and action logging.
6. Add conversations/messages with Supabase Realtime after messages are persisted successfully.
7. Add rental transactions, notifications, and reviews with database rules enforcing completion requirements.

Keep Supabase calls and business rules out of JSX where possible. Place them in focused service modules so screens handle display and user input, while policies/database functions remain the security boundary.

## Planned Supabase data model

The following entities come from the CIT Marketplace software design. They are a planning guide, **not tables that already exist** in this repository or Supabase project.

| Table | Purpose / key fields |
| --- | --- |
| `profiles` | Auth user ID, full name, email, role, classification, account status, verification state, creation date |
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

As the backend is added, consider introducing `src/lib/` for the shared Supabase client and `src/services/` (or feature modules) for auth, listings, messaging, moderation, and transactions. Keep schema migrations in a version-controlled folder such as `supabase/migrations/`.

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
| `/login` | Login screen |
| `/signup` | Signup screen |

There is no admin route yet.

## Development status and next steps

### Present in the frontend prototype

- Main buyer/seller screens and route navigation.
- Sample listing data and client-side search/filtering.
- Basic form validation and visual states.
- Responsive styling and static campus imagery.

### Not yet implemented as working backend features

- Supabase project/client setup and migrations.
- Real email verification, authentication, profiles, roles, and account status.
- Database-backed listings, image uploads, edit/delete/unavailable actions, and approval workflow.
- Admin interface, account verification, report handling, and moderation audit log.
- Persisted listing-linked conversations, messages, and reliable realtime delivery.
- Database-backed sale/rental transactions, return/deposit tracking, and overdue calculation.
- Notifications and post-transaction seller reviews.
- Automated tests for business rules, security policies, and user flows.

## Team notes

- The attached software design describes the intended requirements and architecture; it is not proof that a feature is implemented.
- Never commit `.env.local`, Supabase secret keys, user credentials, or real personal data.
- Use sample/test accounts and a non-production Supabase project while developing.
- Make database schema and policy changes reproducible through reviewed migrations.
- The current demo data uses a sample user named Ana Reyes; replace it with authenticated profile data when integrating Supabase.

## References

- [Supabase React Auth quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Supabase security production checklist](https://supabase.com/docs/guides/security/production-checklist)
- [Supabase JavaScript client initialization](https://supabase.com/docs/reference/javascript/initializing)
