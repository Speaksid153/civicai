# CivicAI

CivicAI is a civic issue reporting and municipal operations dashboard for Bengaluru. Citizens can submit a geolocated issue, while approved authority accounts can triage, assign, resolve, archive, and analyze reports.

## Why there are no AI API keys

The original browser application embedded Gemini and Groq credentials in its JavaScript bundle. Any visitor could extract and spend those credentials. This version removes both providers and the `@google/genai` dependency entirely.

Classification, priority suggestions, hazard flags, duplicate scoring, operational insights, and weekly reports now run through a deterministic local rules engine in `src/services/civicIntelligence.js`. This design is:

- token-free and available offline after the app loads;
- fast and predictable;
- auditable, because the same input produces the same output;
- honest about its limitations: it is rules-based routing, not semantic model inference.

## Security model

- Firebase web configuration is public application metadata, not a server secret. Security must come from Firestore Rules, authorized domains, App Check, quotas, and monitoring.
- Full reports and exact coordinates are stored in the private `reports` collection.
- The public dashboard reads sanitized records from `publicReports`, which contain a coarse location and no free-text description.
- Authority access uses a one-time Firebase email sign-in link. Every authority must have a verified email; the bootstrap owner is checked in both Firestore Rules and the client route.
- Public self-registration for authority accounts has been removed.
- `firestore.rules` denies public reads of private reports and all deletes, validates the complete citizen payload, and permits only `pending → assigned → resolved → archived` authority transitions.
- Assignment and resolution actor fields are derived from Firebase Authentication and cannot be supplied as another identity.
- The web client supports Firebase App Check with reCAPTCHA Enterprise through `VITE_FIREBASE_APPCHECK_SITE_KEY`.

App Check enforcement and budget/usage alerts are cloud-console controls and must be enabled in the Firebase project before accepting untrusted public traffic. Client-only code cannot reliably rate-limit a determined anonymous attacker, so a high-volume municipal deployment should put report creation behind a trusted API with durable rate limiting.

## Local setup

```bash
npm install
copy .env.example .env
npm run dev
```

Set these public Firebase web configuration values in `.env` and in the hosting environment:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_APPCHECK_SITE_KEY` (reCAPTCHA Enterprise score-based site key)
- `VITE_AUTHORITY_EMAIL` (must match the verified bootstrap owner in `firestore.rules`)

No Gemini, Groq, OpenAI, or other chatbot token is used.

For non-Firebase hosting, the production domain is used as `VITE_FIREBASE_AUTH_DOMAIN` and `/__/auth/*` is reverse-proxied to the project's `firebaseapp.com` helper. The authority flow itself is passwordless email-link authentication, so it does not depend on OAuth popups or cross-site redirect state.

## Authority provisioning

The initial owner requests a one-time link using the email configured in `VITE_AUTHORITY_EMAIL` and `firestore.rules`. This email is public configuration, not a secret; Firestore trusts only the verified email claim in Firebase's signed ID token.

The production login currently sends links only to the configured bootstrap owner to prevent public email abuse. Before onboarding additional staff, extend that allow-list in a trusted backend, then create `authorities/{uid}` with at least:

```json
{
  "active": true,
  "name": "Officer name",
  "department": "BBMP Roads"
}
```

Deploy `firestore.rules` using the Firebase CLI or Firebase console after any authorization-policy changes. Enable Firestore enforcement only after the App Check request metrics show legitimate production traffic receiving valid tokens.

Never rely on the frontend email comparison by itself. The deployed `firestore.rules` independently checks the signed, verified Firebase identity before granting access.

## Commands

```bash
npm run dev       # local development
npm run build     # production build
npm run lint      # static checks
npm test          # local rules-engine tests
npm run test:rules # Firestore emulator authorization tests (requires Java 21+)
npm run test:all   # unit and Firestore rules tests
```

## Main stack

- React 19 and Vite
- Firebase Authentication and Firestore
- Leaflet / OpenStreetMap
- Deterministic local civic rules engine

## Known operational work

- Existing private reports need a one-time migration into sanitized `publicReports` documents if they should appear on the public activity view.
- Firebase App Check enforcement, budget alerts, and platform-level rate limiting must be configured in the deployed Firebase project.
- Authority membership documents must be administered outside the public client.

Licensed under the MIT License.
