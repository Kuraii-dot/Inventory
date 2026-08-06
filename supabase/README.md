# Supabase first-time setup

1. Open the Supabase project SQL Editor.
2. Paste and run `migrations/202608060001_initial_schema.sql`.
3. Open `create-master-admin.sql`, replace both placeholders locally, and run it in the SQL Editor.
4. Never commit the edited administrator file or any real password.

The Vercel API connects through `DATABASE_URL` using Supabase's transaction
pooler. The browser and Tauri application never receive database credentials.
