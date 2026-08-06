# Supabase first-time setup

1. Open the Supabase project SQL Editor.
2. Paste and run `migrations/202608060001_initial_schema.sql`.
3. Open `create-master-admin.sql`, replace both placeholders locally, and run it in the SQL Editor.
4. Never commit the edited administrator file or any real password.

## Restoring the legitimate local records

Run the initial schema migration first. Then use `restore-inventory-backup.ps1`
with the Supabase session-pooler host, port, and username shown by the Connect
dialog. The script prompts securely for the database password and restores only
the Smart Inventory application tables from the custom PostgreSQL backup.

The Vercel API connects through `DATABASE_URL` using Supabase's transaction
pooler. The browser and Tauri application never receive database credentials.
