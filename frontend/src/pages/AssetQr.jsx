import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { lookupQrAsset } from '../api/personnelAssets.js';

export default function AssetQr() {
  const { token } = useParams();
  const [asset, setAsset] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { lookupQrAsset(token).then(setAsset).catch(e => setError(e.response?.data?.message || 'Unable to load this asset.')); }, [token]);
  return <main className="min-h-screen bg-slate-100 px-4 py-10">
    <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 shadow-xl border border-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
        <img src="/Logo.png" className="h-12 w-12 rounded-xl object-cover" alt="Organization logo" />
        <div><h1 className="text-xl font-bold text-slate-800">Smart Inventory</h1><p className="text-xs text-slate-500">Official property record</p></div>
      </div>
      {!asset && !error && <p className="py-12 text-center text-slate-500">Loading asset record...</p>}
      {error && <p className="my-8 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {asset && <div className="py-6 space-y-5">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Asset code</p><p className="text-2xl font-bold text-slate-900">{asset.asset_code}</p></div>
        <Info label="Item" value={asset.inventory_name} /><Info label="Type" value={asset.item_type} />
        <Info label="Status" value={asset.status?.replaceAll('_',' ')} /><Info label="Condition" value={asset.current_condition} />
        <Info label="Assigned to" value={asset.assigned_to || 'Not currently assigned'} /><Info label="Department" value={asset.department || '—'} />
        <p className="rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-700">This page contains the public asset summary. Sign in to the inventory system to see procurement and maintenance records.</p>
      </div>}
    </div>
  </main>;
}
function Info({label,value}) { return <div className="flex justify-between gap-4 border-b border-slate-100 pb-3"><span className="text-sm text-slate-500">{label}</span><span className="text-right text-sm font-semibold capitalize text-slate-800">{value}</span></div>; }
