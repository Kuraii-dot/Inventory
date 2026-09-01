# Smart Inventory — Supabase Cloud Cutover

Smart Inventory 1.1 uses the Inventory Supabase project as its hosted server.
The Tauri application no longer calls the office-only `192.168.33.246:5000`
endpoint.

## Security model

- The Tauri installer contains only the Inventory Supabase URL and publishable
  key. A publishable key is not a database administrator credential.
- Every API request requires a signed-in Supabase Auth user.
- The Edge Function maps the Supabase user to the existing `public.users` row,
  preserving the current `user`, `admin`, and `master_admin` roles.
- Database passwords and Supabase secret keys stay out of the installer.
- TCMS uses a dedicated `integration` account plus the existing shared
  integration key.
- FIFO stock deductions, releases, returns, and distribution creation continue
  to execute inside the existing database transactions.

## One-time deployment

1. Open the Inventory Supabase project.
2. Under **Project Settings → API Keys**, copy:
   - the **publishable key** (`sb_publishable_...`), and
   - a **secret key** (`sb_secret_...`).
3. Run `tools/setup/configure_inventory_supabase_cloud.bat` from the Inventory project.
4. Sign in to the Supabase CLI when the browser opens.
5. Enter the requested values. Passwords and the secret key are hidden.
6. After the script succeeds, run
   `C:\Users\CCWD\Desktop\InventorySys- Railway\build_smart_inventory_installer.bat`.
7. Test the x64 installer on one computer before wider installation.

For later Edge Function updates, run
`tools/setup/redeploy_inventory_cloud_api.bat`.

The configuration script performs the schema migration, deploys the
authenticated Edge Function, creates/links the master administrator and TCMS
integration identities, configures TCMS, and writes only the publishable client
settings into `frontend/.env.tauri`.

## Existing Inventory users

The master administrator is linked during the one-time setup. Other existing
users appear under **Admin → Users** as **Needs password reset**. Edit each user,
enter a new password, and save. That creates their Supabase Auth identity. Newly
created users are cloud-ready immediately.

## Cutover and rollback

- Do not remove the existing local Node backend until Smart Inventory 1.1 has
  passed login, item, allocation, distribution, inspection release, restore,
  report, and TCMS synchronization tests.
- The existing LAN build remains a rollback option.
- After successful testing, `run_os_unified_stack.bat` automatically uses the
  Supabase Edge endpoint and no longer starts or checks port 5000.

## Connectivity behavior

- When connected, the navigation bar shows **Cloud connected**.
- When offline, existing screen data remains visible, but live loads and stock
  mutations are rejected with a reconnect message.
- Release, deduction, return, and restore operations intentionally require an
  internet connection to prevent conflicting offline stock changes.
