# QR-ATT — QR Attendance System

Expo / React Native application for student event attendance using QR codes and Supabase.

## Run the project

1. Install Node.js (LTS) and npm.
2. Copy `.env.example` to `.env`.
3. Fill in your existing Supabase project URL and publishable/anon key. Never put a service-role key in this app.
4. Run `npm install`.
5. Run `npx expo start` and open the app on your device or emulator.

## Main features

- Student registration and login, session persistence, and logout.
- Student profile and personal attendance history.
- Teacher event creation, editing, reusable QR display for existing events, attendance records, and summaries.
- Administrator user/event management, reusable QR display for existing events, date/time picker editing, and attendance record management.
- QR scan validation, open/closed event checks, and duplicate-attendance error handling. Attendance is accepted at any scheduled time while the event status is open.
- Midnight-plum, teal, and amber theme; the app icon uses the same theme and displays **GOMEZ**.

## Important implementation notes

- Public registration creates student accounts only. Teacher and administrator access should be granted through an authorized administrator/database process.
- QR attendance now looks up an existing event and rejects unknown QR payloads; scanning cannot create an event.
- Attendance checks the authenticated user ID, validates the QR against an existing event, and requires the event status to be `open`. Scheduled start/end timestamps do not block scanning; closing an event disables attendance.
- Duplicate prevention must also be enforced in Supabase with a unique constraint on `(student_id, event_id)` and suitable Row Level Security policies. Keep your existing Supabase policies enabled and verify they enforce role-based access.
- The Supabase schema and policies are hosted in your project and are not included in this source ZIP. The client-side checks are not a substitute for database authorization.

## Final exam demonstration checklist

Demonstrate registration/login, role-based access, create/edit/close event, QR generation, successful scan, invalid QR, duplicate scan, closed event, attendance history, teacher summaries, admin controls, and logout. Explain each event as **Event → Handler → Action → Result**.

## Fixes in this review

- Removed the scheduled-time rejection that caused `Event has not started yet` even when the teacher intended the event to remain open. Student authentication, student-role checks, event-code lookup, open/closed status validation, and duplicate prevention remain in place.
- Added **View QR** actions for existing events in both Teacher and Admin screens. These regenerate the QR payload from the saved event code, so creating a new event is not required to display it again.
- Updated the Teacher and Admin event-edit pickers to select date and time in separate steps on Android. Dismissing the native picker closes only the picker, not the event editor.
- Student history now displays a query error instead of silently presenting a database/query failure as an empty attendance history.

## Before the final demo

The source can be reviewed locally, but this environment does not have the app dependencies or your live Supabase project credentials/policies, so a real-device scan and live database/RLS test cannot be certified here. Copy `.env.example` to `.env`, enter your existing Supabase URL and anon/publishable key locally, install dependencies, then test each item in the checklist above. Never share a service-role key or commit `.env`.
