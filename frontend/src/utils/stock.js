export function isLowStock(quantity) {
  return Number(quantity) <= 10;
}

export function stockTextClass(quantity) {
  return isLowStock(quantity) ? 'text-red-600' : 'text-emerald-600';
}

export function stockBadgeClass(quantity) {
  return isLowStock(quantity)
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';
}
