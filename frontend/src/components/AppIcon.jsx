import {
  AlertTriangle, ArchiveRestore, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  BarChart3, Boxes, Box, Check, ChevronDown, CircleUserRound, ClipboardList,
  Clock3, Eye, FileBarChart, FileSpreadsheet, FileText, Filter, FolderArchive,
  FolderTree, History, Info, Layers3, LayoutDashboard, ListTree, LogOut,
  Menu, Package, PackageCheck, PackageOpen, Pencil, Plus, RefreshCw, RotateCcw,
  Search, Settings2, ShieldCheck, Sparkles, Sun, Moon, Trash2, Truck,
  Undo2, Users, Warehouse, X, Zap,
} from 'lucide-react';

const icons = {
  alert: AlertTriangle, archive: FolderArchive, arrowDown: ArrowDown, arrowLeft: ArrowLeft,
  arrowRight: ArrowRight, arrowUp: ArrowUp, barChart: BarChart3, box: Box, boxes: Boxes,
  categories: FolderTree, check: Check, chevronDown: ChevronDown, clipboard: ClipboardList,
  clock: Clock3, dashboard: LayoutDashboard, edit: Pencil, eye: Eye, file: FileText,
  fileChart: FileBarChart, filter: Filter, history: History, info: Info, layers: Layers3,
  ledger: ListTree, logout: LogOut, menu: Menu, moon: Moon, package: Package,
  packageCheck: PackageCheck, packageOpen: PackageOpen, plus: Plus, refresh: RefreshCw,
  report: FileSpreadsheet, restore: ArchiveRestore, return: Undo2, rotate: RotateCcw,
  search: Search, settings: Settings2, shield: ShieldCheck, sparkles: Sparkles, sun: Sun,
  trash: Trash2, truck: Truck, user: CircleUserRound, users: Users, warehouse: Warehouse,
  x: X, zap: Zap,
};

export default function AppIcon({ name, size = 16, strokeWidth = 2, className = '', ...props }) {
  const Icon = icons[name] ?? Package;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...props} />;
}
