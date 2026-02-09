# Technology Stack

[日本語](technology.md) | English

## Frontend

- Next.js App Router + React 19 + TypeScript
- Pages: `/`, `/editor`, `/items`, `/history`, `/settings`, `/about`
- Localization: strings are centralized in `src/lib/i18n.ts` and switched via `?lang=`

## UI / Styling

- Tailwind CSS v4 (PostCSS)
- Shared UI is built around `SiteHeader` / `SiteFooter`

## Backend / API

- Next.js Route Handlers (Node.js 20)
- `/api/health`, `/api/icons`, `/api/diagrams`, `/api/auth/login`, `/api/auth/logout`

## Authentication

- Microsoft Entra ID (MSAL): `@azure/msal-browser`, `@azure/msal-react`
- Server-side token validation: `jose`

## Persistence

- Browser local storage by default (saved diagrams, history, drafts)
- Azure Cosmos DB (SQL API) uses `@azure/cosmos` and `DefaultAzureCredential` when configured

## Export

- `html2canvas` generates PNG images
- JSON export / import

## Container / Hosting

- Docker multi-stage build
- Runs `next start` on Azure Container Apps

## Logging / Monitoring

- Exceptions and diagnostics are logged to `console`
- Container Apps logs are intended for Log Analytics / Application Insights
