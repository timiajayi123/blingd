# TIMZI Hub Template Web

Reusable Next.js storefront and admin application, copied from the working commerce project and stripped of original branding, media, environment secrets, deployment bindings and Git history. This is a local template; no production service has been connected or changed.

## Start a new project

1. Copy this folder and give the new project its own name and Git repository.
2. Install Node.js 22, then run npm ci.
3. Copy .env.example to .env.local. Configure your Appwrite endpoint, project, database, API key, storage bucket and collection IDs. Unconfigured defaults deliberately cannot reach the original project.
4. Create the core collections using docs/appwrite-schema-reference.md. The generic collection prefix is storefront_. Run the applicable npm run setup:* commands for supplemental schemas. Setup scripts need a server API key with the required schema permissions.
5. Set NEXT_PUBLIC_SITE_NAME, NEXT_PUBLIC_SITE_URL, description, logo and support details. Run npm run template:brand -- --name "Your Store" to replace the visible BLING’D text throughout the template. Configure social links, support contacts and email sender addresses for your business.
6. Configure Paystack, transactional email, ImageKit and push notifications only when needed, using your own keys and verified sender. Choose the corresponding variables listed in .env.example. Never expose server secrets through NEXT_PUBLIC_ variables.
7. Run npm run dev. Add products and store media through the admin pages. Create your admin session credentials and Appwrite access rules before publishing.
8. Review business copy, terms, returns, delivery and currency/payment rules for the new business; the inherited checkout defaults use NGN and Paystack. Run npm run build and test a sandbox checkout before deploying.

## Link to TIMZI Hub

Create a separate project entry in TIMZI Hub. Set TIMZI_HUB_PROJECT_SLUG to that entry's slug and configure TIMZI_HUB_APPWRITE_PROJECT_ID, TIMZI_HUB_DATABASE_ID and the private read key for the waitlist integration. NEXT_PUBLIC_TIMZI_HUB_URL defaults to the existing central Hub URL. The protected billing API integration remains available and needs its own TIMZI_HUB_API_KEY.

Operational auto-sync is in scripts/appwrite-functions/storefront-hub-sync. Install its own dependencies separately; it uses node-appwrite 29 while the web application retains its existing SDK. Configure that function's .env.example variables as Appwrite function variables, including the new Hub project row ID. Use a private Node 22 function with index.js as entrypoint and npm install as build command. Keep the Hub write key secret. Grant temporary source function key scopes rows.read, tables.read and databases.read. Subscribe to tablesdb.<SOURCE_DATABASE_ID>.tables.<TABLE_ID>.rows.* for each of the nine storefront_* tables listed in the function, and optionally schedule 0 * * * * for hourly recovery.

Create a private Hub table named storefront_sync_state (or HUB_SYNC_STATE_TABLE) with string columns project_id (36), collection_id (64), source_id (128), source_updated_at (datetime), payload_json (longtext), and a key index on project_id and collection_id. Enable row security with no public permissions. Commerce destination tables must use the existing TIMZI Hub commerce schema; the write key must have only the necessary access. Each project receives its own ID namespace and checkpoint.

The sync projects orders/items/customers, products/variants/media URLs/categories, delivery, drops and settings into Hub commerce tables. Banners, billing services and inventory reservations are stored privately as JSON snapshots. It excludes analytics and push subscriptions, retains source deletions for review, and consumes source reads and Hub reads/writes. Media files are not copied: move them into the new project's storage and update URLs before retiring an old host. For a large initial migration, backfill in bounded batches before enabling hourly reconciliation.

## Media and routes

All original image, video, audio, model and logo files are removed. Empty image slots use a neutral placeholder.svg; the ImageKit manifest is empty. Upload your own assets. The optional 3D editor still contains its logic and expects your own model at public/template-assets/model.glb. Replace placeholder video sources with your own video URLs when enabling video backgrounds. Font declarations referring to removed custom font files were removed.

Internal page links are preserved, with the original branded shop route renamed to /storefront. No original database records, customer exports, credentials, Git history, node_modules, build cache or Vercel project binding are included. Existing app features require configuration; this is not a pre-provisioned backend.

## Verification of this template

All 233 TypeScript files passed syntax and local-import checks, and the five inventory reservation tests passed. The launch-check suite has ten existing failures that also occur in the source project; these checks require maintenance before relying on that suite as a deployment gate. A production build and live checkout require your own configured backend and provider credentials.

