# TCMS field inspection to Smart Inventory

> **Legacy rollback reference only.** Smart Inventory 1.1 and later use the
> authenticated Supabase cloud endpoint. Do not use this LAN procedure for the
> current deployment unless intentionally rolling back.

The integration is server-to-server. The Android app continues to use Supabase; it never receives the Inventory database password or integration key.

The two databases stay separate:

- TCMS/mobile inspection Supabase: `https://oadamormrirmwoplvazz.supabase.co`
- Smart Inventory Supabase: `https://lnplmxyevcjohgpdpgfh.supabase.co`

The TCMS server does not use the Inventory Supabase URL as its integration URL. It calls the Smart Inventory Node API, and that API connects to the Inventory Supabase database through its own `DATABASE_URL`.

## What the workflow does

1. TCMS copies the live Smart Inventory material catalog to the existing Supabase `inspection_materials` table.
2. The inspector app displays those real materials, prices, units, and current available quantities.
3. When an inspection is submitted, TCMS saves it as usual and sends an idempotent preparation request to Smart Inventory.
4. Inventory staff can keep the inspector's original selections visible while changing, adding, or removing the prepared materials.
5. Stock is not deducted while a request is new, preparing, or ready. It is deducted FIFO only when Inventory staff choose **Release materials**.

## One-time deployment

### 1. Update and start Smart Inventory

Use the updated Smart Inventory project in `C:\Users\CCWD\Desktop\InventorySys- Railway`. The folder name does not mean Railway hosting is required.

Run this migration against the Smart Inventory PostgreSQL database:

`supabase/migrations/202608240001_tcms_inspection_requests.sql`

In `backend/.env`, add an environment variable named `INVENTORY_INTEGRATION_KEY`. Use a random secret of at least 24 characters. Do not commit the real secret.

The Tauri desktop application uses the Smart Inventory Node API running on the central office server. The current server LAN address is `http://192.168.33.246:5000`; reserve this address in the router or update and rebuild the Tauri app if the address changes.

Start or restart the Inventory backend after changing `backend/.env`. `run_os_unified_stack.bat` now starts the local Inventory API automatically whenever the integration is enabled.

Do not enter `https://lnplmxyevcjohgpdpgfh.supabase.co` into `configure_inventory_integration.bat`; that script requires the Inventory Node API URL. Use the suggested LAN URL. The script saves the same shared integration key into both the Inventory backend `.env` and the TCMS user environment.

### 2. Update the TCMS Supabase schema

Open the TCMS Supabase SQL Editor and run the file retained in the OS project:

`C:\Users\CCWD\Desktop\OS\just things\sql\SUPABASE_INVENTORY_MATERIAL_CATALOG.sql`

This only extends the existing material catalog. It does not replace authentication, applications, submissions, photos, or GPS data.

### 3. Configure the OS/TCMS server

Run `tools/legacy-lan/configure_inventory_integration.bat` and enter:

- the local or LAN Smart Inventory backend URL;
- the exact same integration key configured in the Inventory backend `.env` file.

Then restart `C:\Users\CCWD\Desktop\OS\run_os_unified_stack.bat`.

Within about five minutes, Inventory categories, classifications, items, stock quantities, and prices should appear in the inspector app. Existing submitted inspections are backfilled to Inventory in batches.

## APK requirement

Install a newly built APK once because this version of the mobile app displays Inventory units and available quantities and prefers Inventory-sourced catalog rows. Future changes to the Inventory URL, shared secret, stock, prices, and material names do not require reinstalling the APK.

## Verification

1. Open Smart Inventory and confirm the new **Inspection Requests** navigation entry appears.
2. Open a fresh inspection in the Android app and confirm material rows show current Inventory availability.
3. Submit a test inspection with one or two materials.
4. Wait for the TCMS synchronization cycle, then refresh **Inspection Requests** in Smart Inventory.
5. Change a prepared quantity or material and save it. Confirm the inspector's original request remains visible.
6. Choose **Release materials** only for a test you intend to post; confirm the corresponding FIFO stock decreases and distribution entries are created.

If the request does not arrive, check the TCMS API console for an Inventory synchronization warning, then verify the public Inventory URL, shared key, and both database migrations.
