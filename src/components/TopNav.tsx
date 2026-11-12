import { Download, LogIn } from 'lucide-react';

export type ActiveTab = 'survey' | 'registry' | 'analytics' | 'report';

interface TopNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isAdmin: boolean;
  respondentCount: number;
  onExportExcel: () => void;
  onSignInGoogle: () => void;
  signingIn: boolean;
}

const ADMIN_NAV_ITEMS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'survey', label: 'Опитування' },
  { id: 'registry', label: 'Реєстр даних' },
  { id: 'analytics', label: 'Аналітика' },
  { id: 'report', label: 'Автозвіт' },
];

export function TopNav({
  activeTab,
  onSelectTab,
  isAdmin,
  respondentCount,
  onExportExcel,
  onSignInGoogle,
  signingIn,
}: TopNavProps) {
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : [{ id: 'survey' as ActiveTab, label: 'Опитування' }];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Brand wordmark (single text element) */}
        <button
          type="button"
          onClick={() => onSelectTab('survey')}
          className="text-left text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded"
        >
          Психодіагностика
        </button>

        {/* Zone 2: Navigation links (only Survey for respondents; full tabs for Admin) */}
        <nav
          aria-label="Основна навігація"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded ${
                  isActive
                    ? 'text-blue-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isAdmin && item.id === 'registry' && respondentCount > 0 ? (
                  <span className="ml-1.5 font-mono text-xs text-slate-500 tabular-nums">
                    ({respondentCount})
                  </span>
                ) : null}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-blue-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action (Excel Export for Admin; Google Sign-In for Researcher) */}
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin ? (
            <button
              type="button"
              onClick={onExportExcel}
              disabled={respondentCount === 0}
              title={
                respondentCount === 0
                  ? 'Спочатку зберіть або додайте хоча б одного респондента'
                  : 'Завантажити багатоаркушеву таблицю Excel (.xlsx)'
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors duration-150 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Експорт у Excel</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={signingIn}
              onClick={onSignInGoogle}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{signingIn ? 'Вхід...' : 'Вхід для адміністратора'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation strip (only shown when Admin has multiple tabs) */}
      {isAdmin && (
        <nav
          aria-label="Мобільна навігація"
          className="flex md:hidden items-center gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
                {item.id === 'registry' && respondentCount > 0 ? ` (${respondentCount})` : ''}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
