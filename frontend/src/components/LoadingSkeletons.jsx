function SkeletonBar({ width = 'w-full', height = 'h-3' }) {
  return <span aria-hidden="true" className={`block ${width} ${height} rounded-full bg-slate-200/90`} />;
}

export function InlineSkeleton({ width = 'w-28' }) {
  return <span className="inline-flex items-center h-5" aria-label="Loading"><SkeletonBar width={width} /></span>;
}

export function TableSkeletonRows({ columns = 6, rows = 7 }) {
  return Array.from({ length: rows }, (_, row) => (
    <tr key={`skeleton-${row}`} className="animate-pulse" aria-hidden="true">
      {Array.from({ length: columns }, (_, column) => (
        <td key={column} className="py-4 px-4">
          <SkeletonBar
            height={column === 0 ? 'h-4' : 'h-3'}
            width={column === 0 ? 'w-36' : column % 3 === 0 ? 'w-20' : 'w-24'}
          />
          {column === 0 && <span className="block mt-2"><SkeletonBar width="w-24" height="h-2.5" /></span>}
        </td>
      ))}
    </tr>
  ));
}

export function CardGridSkeleton({ cards = 6 }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4" aria-label="Loading records">
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-pulse">
          <div className="flex justify-between gap-5">
            <div className="flex-1 space-y-3"><SkeletonBar width="w-24" /><SkeletonBar width="w-2/3" height="h-5" /><SkeletonBar width="w-4/5" /></div>
            <SkeletonBar width="w-20" height="h-7" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-100">
            <SkeletonBar width="w-16" /><SkeletonBar width="w-16" /><SkeletonBar width="w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

