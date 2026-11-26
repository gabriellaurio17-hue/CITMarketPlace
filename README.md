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
2. Run the SQL migration in `supabase/migrations/20261126000000_marketplace_full_database.sql` in the Supabase SQL Editor.
3. Set email confirmation and site redirect URLs for the project's authentication settings.
4. Ensure the `listing-images` Storage bucket is public, or update it using the migration.

## Demo accounts

Log in with one of these existing accounts using username as shown and password `demo`. There is no email verification or confirmation step.

| Role | Username | Email |
| --- | --- | --- |
| Member | `ana` | `ana.reyes@cit.edu` |
| Member | `marco` | `marco.dc@cit.edu` |
| Member | `bea` | `bea.santos@cit.edu` |
| Administrator | `admin` | `admin@cit.edu` |

Sign up accepts a unique username, a unique `@cit.edu` email, and a password with confirmation. Accounts are saved in localStorage, so any number of accounts can be created and reused after a refresh. Logging out returns to Login; signing in as another account immediately switches the active profile. Data is specific to the browser and can be cleared by removing the `cit-marketplace-demo-v1` localStorage key.

This is demonstration authentication only. It is not secure and should not be used for real user accounts or sensitive data. Uploaded listing photos are selected in the form but are not persisted in the demo.
