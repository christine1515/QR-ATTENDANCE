# QR-ATT — final project setup

## Build readiness
The React Native app passes TypeScript checking and the Android JavaScript export succeeds. This ZIP is a cleaned source-code project, not a prebuilt APK or a guarantee of successful device execution.

## Configure EAS environment variables
In the Expo dashboard, add these variables to the **Preview** environment:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Use the values from your private local `.env`. Never place a Supabase service-role key in the mobile app or public repository. The local `.env` is intentionally not included in this ZIP.

## Build an APK
From the project directory:

```bash
npm ci
npm run typecheck
npx expo-doctor
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

The `preview` profile is configured for internal distribution and uses the EAS `preview` environment. Download the APK from the EAS build page after the build finishes.

## Backend setup
The Admin Delete User button requires the included Supabase Edge Function to be deployed to your own Supabase project. Run:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy delete-user
```

Verify the function's server-side environment includes the appropriate Supabase URL, anon key, and service-role key. Keep the service-role key server-side only. Verify that user deletion cascades correctly under your existing foreign keys.

Edit User and Remove Attendance features also require matching RLS policies on `profiles` and `attendance`. Role updates must be protected so students cannot promote themselves. These live database policies cannot be verified from source code alone.

## Device test checklist
- Log in and log out for Student, Teacher, and Admin accounts.
- Create, edit, view, and close a test event.
- Generate and scan a QR code.
- Verify invalid QR, closed event, and duplicate attendance are rejected.
- Verify each role can only access permitted records.
- Verify camera permission prompts and attendance confirmation.
