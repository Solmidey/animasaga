# The Commandments

These laws govern all AnimaSaga systems.

They are non-negotiable.

## I. No Direct Database Access
All data access must pass through server-side middleware.

## II. Gatekeep Every Action
Every endpoint must verify identity and authorization.

## III. Do Not Hide, Withhold
Premium data is never sent unless entitlement is verified server-side.

## IV. Keep Secrets Off the Browser
No API keys, secrets, or private logic may exist client-side.

## V. .env Is Not Security
Secrets must never be bundled into client code.

## VI. Do Not Do Math on the Phone
All sensitive calculations occur server-side.

## VII. Sanitize Everything
All inputs are treated as hostile by default.

## VIII. Rate Limit All Actions
No endpoint may be spammed.

## IX. Do Not Log Sensitive Data
Logs must never expose secrets or personal data.

## X. Keep Dependencies Updated
Known vulnerabilities are unacceptable.

## XI. Handle Errors Quietly
Users see minimal errors. Full logs remain server-side.

These Commandments persist across Seasons.
