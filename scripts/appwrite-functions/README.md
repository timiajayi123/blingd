flip-release Appwrite Function

Purpose
- Periodic function to flip `relased` field to `true` on products whose `releaseAt` timestamp has passed. Also backfills `countdownEnabled` defaults.

Environment
- APPWRITE_ENDPOINT
- APPWRITE_PROJECT
- APPWRITE_KEY (server key)
- APPWRITE_DATABASE_ID
- APPWRITE_PRODUCTS_COLLECTION_ID

Deployment
1. Zip the function folder and upload it to Appwrite as a new Function (Node 18).
2. Add the environment variables above to the Function.
3. Schedule the Function via Appwrite console to run every minute (cron) or at your preferred cadence.

Notes
- The function uses the Appwrite Databases SDK; adapt the pagination parameters depending on your SDK version.
- For extremely large collections consider chunked updates with careful rate limits.
