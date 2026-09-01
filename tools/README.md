# Smart Inventory tools

## Current Supabase cloud setup

Use the scripts in `setup/`:

- `configure_inventory_supabase_cloud.bat` — one-time cloud authentication and deployment setup.
- `redeploy_inventory_cloud_api.bat` — redeploy the hosted Inventory API after backend changes.
- `configure_inventory_database.bat` — repair or verify the Inventory database connection.
- `inventory_database_tool.mjs` — helper used by the database configurator.

## Legacy LAN rollback

`legacy-lan/` is retained only for an intentional rollback to the former office-server API. It is not used by Smart Inventory 1.1 or later.

