# Operations Guide

[日本語](operations.md) | English

## Local Development

1. Copy `.env.template` to `.env`
2. Install dependencies with `npm install`
3. Start the dev server with `npm run dev`
4. Visit `http://localhost:3000/editor`

## Icon Management

- Place production icons under `public/icons`
- `public/icons` is git-ignored
- Toggle `public/icons-sample` via `ICONS_SAMPLE_ENABLED`

## Storage and Recovery

- Default storage is browser local storage
- When Cosmos DB is configured, the app uses `/api/diagrams` for cloud persistence
- JSON export/import provides lightweight backups

## Hosting on Azure Container Apps (detailed)

1. Create Azure Container Registry (ACR)
2. Build and push the image to ACR
3. Create the Container Apps environment and app
4. Configure environment variables
   - `PORT` (default 3000)
   - `NODE_ENV=production`
   - `COSMOS_ENDPOINT` / `COSMOS_DATABASE` / `COSMOS_CONTAINER` when using Cosmos DB
5. Configure health checks to `/api/health`
6. Enable managed identity for the app
7. Connect logs to Log Analytics / Application Insights

> The app runs as a single container using `next start`.

## Cosmos DB Configuration (detailed)

### Resource Setup

- Create a Cosmos DB (SQL API) account
- Create a database and container
  - Partition key: `/id`
  - Set RU to match expected traffic

### Authentication (AAD)

- Local: Azure CLI credentials (`az login`)
- Production: managed identity on Container Apps
- Assign RBAC role
  - Read/write: `Cosmos DB Built-in Data Contributor`
  - Read-only: `Cosmos DB Built-in Data Reader`

### Connection Settings

- Set the following in `.env` or ACA env vars
  - `COSMOS_ENDPOINT`
  - `COSMOS_DATABASE`
  - `COSMOS_CONTAINER`

> Cosmos DB enforces a 2 MB item limit, so keep each diagram payload under that limit.

## Troubleshooting

- Check server logs and `diagnostics` for Cosmos DB failures
- For 429 errors, increase RU or reduce write frequency
- A 501 response from the API indicates Cosmos DB is not configured
