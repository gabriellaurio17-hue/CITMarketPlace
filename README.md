# CIT Marketplace

CIT Marketplace uses Supabase for authentication and persistent marketplace data when `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` are configured. It falls back to browser `localStorage` for development without Supabase.

## Run locally

```sh
npm install
npm start
```

Create React App opens the app at `http://localhost:3000`. To make a production build, run `npm run build`.

## Supabase setup

1. Copy `.env.example` to `.env.local` and set the project URL and publishable (anon) key.
2. Run all SQL files in `supabase/migrations/` in filename order in the Supabase SQL Editor.
3. Set email confirmation and site redirect URLs for the project's authentication settings.
4. Sign up and log in with the account that will administer the marketplace. In SQL Editor, promote that account using its exact email:

   ```sql
   update public.profiles
   set role = 'admin',
       classification = 'Admin',
       is_verified = true,
       verification_status = 'approved',
       account_status = 'active'
   where email = 'admin@cit.edu';
   ```

5. Test signup and email confirmation, account approval, listing create/edit/approval, photo upload, search, rentals, chat notifications, reports, and moderation logs with separate member and administrator accounts.

The security migration grants users access to public profile fields only. Private profile details and administrator profile actions go through restricted database functions.

## Demo accounts

These accounts are available only in the local-storage demo mode, which is used when Supabase environment variables are not configured.

| Role | Username | Email |
| --- | --- | --- |
| Member | `ana` | `ana.reyes@cit.edu` |
| Member | `marco` | `marco.dc@cit.edu` |
| Member | `bea` | `bea.santos@cit.edu` |
| Administrator | `admin` | `admin@cit.edu` |

In local-storage demo mode, signup accepts a unique username, a unique `@cit.edu` email, and a password with confirmation. Accounts and marketplace data are saved in this browser and can be cleared by removing the `cit-marketplace-demo-v1` localStorage key.

Local-storage demo authentication is not secure and should not be used for real accounts or sensitive data. Uploaded listing photos are not persisted in demo mode.
