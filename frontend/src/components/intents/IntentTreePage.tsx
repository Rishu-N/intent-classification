import { useEffect, useState } from 'react';
import { useClassifyStore } from '../../store/classifyStore';

const DOMAIN_COLORS = [
  {
    border: 'border-indigo-200',
    header: 'bg-indigo-600',
    headerText: 'text-white',
    catBg: 'bg-indigo-50',
    catText: 'text-indigo-800',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
    badgeHover: 'hover:bg-indigo-200',
    chevron: 'text-white',
  },
  {
    border: 'border-emerald-200',
    header: 'bg-emerald-600',
    headerText: 'text-white',
    catBg: 'bg-emerald-50',
    catText: 'text-emerald-800',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    badgeHover: 'hover:bg-emerald-200',
    chevron: 'text-white',
  },
  {
    border: 'border-amber-200',
    header: 'bg-amber-500',
    headerText: 'text-white',
    catBg: 'bg-amber-50',
    catText: 'text-amber-800',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    badgeHover: 'hover:bg-amber-200',
    chevron: 'text-white',
  },
  {
    border: 'border-rose-200',
    header: 'bg-rose-600',
    headerText: 'text-white',
    catBg: 'bg-rose-50',
    catText: 'text-rose-800',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    badgeHover: 'hover:bg-rose-200',
    chevron: 'text-white',
  },
  {
    border: 'border-violet-200',
    header: 'bg-violet-600',
    headerText: 'text-white',
    catBg: 'bg-violet-50',
    catText: 'text-violet-800',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
    badgeHover: 'hover:bg-violet-200',
    chevron: 'text-white',
  },
  {
    border: 'border-sky-200',
    header: 'bg-sky-600',
    headerText: 'text-white',
    catBg: 'bg-sky-50',
    catText: 'text-sky-800',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-700',
    badgeHover: 'hover:bg-sky-200',
    chevron: 'text-white',
  },
  {
    border: 'border-orange-200',
    header: 'bg-orange-500',
    headerText: 'text-white',
    catBg: 'bg-orange-50',
    catText: 'text-orange-800',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    badgeHover: 'hover:bg-orange-200',
    chevron: 'text-white',
  },
];

export function IntentTreePage() {
  const { intentTree, fetchIntentTree } = useClassifyStore();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!intentTree) fetchIntentTree();
  }, [intentTree, fetchIntentTree]);

  const tree = intentTree?.tree ?? {};
  const descriptions = intentTree?.descriptions ?? {};
  const domains = Object.keys(tree);

  const query = search.trim().toLowerCase();

  const filtered = domains.reduce<Record<string, Record<string, string[]>>>((acc, domain) => {
    const cats = tree[domain];
    const filteredCats = Object.keys(cats).reduce<Record<string, string[]>>((ca, cat) => {
      const intents = cats[cat].filter(
        (intent) =>
          !query ||
          intent.toLowerCase().includes(query) ||
          cat.toLowerCase().includes(query) ||
          domain.toLowerCase().includes(query),
      );
      if (intents.length > 0) ca[cat] = intents;
      return ca;
    }, {});
    if (Object.keys(filteredCats).length > 0) acc[domain] = filteredCats;
    return acc;
  }, {});

  const filteredDomains = Object.keys(filtered);
  const totalIntents = intentTree?.all_leaves?.length ?? 0;

  function toggleDomain(domain: string) {
    setCollapsed((prev) => ({ ...prev, [domain]: !prev[domain] }));
  }

  if (!intentTree) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Loading intent tree…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Intent Tree</h2>
        <p className="text-sm text-slate-500 mt-1">
          {domains.length} domains · {totalIntents} leaf intents · hover over an intent to see its description
        </p>
      </div>

      <div className="mb-6 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search domains, categories, or intents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {filteredDomains.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">No intents match "{search}"</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredDomains.map((domain, di) => {
          const colors = DOMAIN_COLORS[di % DOMAIN_COLORS.length];
          const cats = filtered[domain];
          const isCollapsed = collapsed[domain];
          const catCount = Object.keys(cats).length;
          const intentCount = Object.values(cats).reduce((s, arr) => s + arr.length, 0);

          return (
            <div key={domain} className={`rounded-xl border ${colors.border} overflow-hidden shadow-sm`}>
              <button
                onClick={() => toggleDomain(domain)}
                className={`w-full flex items-center justify-between px-4 py-3 ${colors.header} ${colors.headerText} font-semibold text-sm text-left`}
              >
                <span className="flex items-center gap-2">
                  <span>{domain}</span>
                  <span className="font-normal opacity-80 text-xs">
                    {catCount} {catCount === 1 ? 'category' : 'categories'} · {intentCount} intents
                  </span>
                </span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${colors.chevron} ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-slate-100 bg-white">
                  {Object.entries(cats).map(([category, intents]) => (
                    <div key={category} className={`px-4 py-3 ${colors.catBg}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colors.catText}`}>
                        {category}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {intents.map((intent) => {
                          const path = `${domain} > ${category} > ${intent}`;
                          const desc = descriptions[path] || '';
                          return (
                            <IntentBadge
                              key={intent}
                              intent={intent}
                              tooltipPath={`${domain}  ›  ${category}  ›  ${intent}`}
                              tooltipDesc={desc}
                              badgeBg={colors.badgeBg}
                              badgeText={colors.badgeText}
                              badgeHover={colors.badgeHover}
                              highlight={query && intent.toLowerCase().includes(query) ? query : ''}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface IntentBadgeProps {
  intent: string;
  tooltipPath: string;
  tooltipDesc: string;
  badgeBg: string;
  badgeText: string;
  badgeHover: string;
  highlight: string;
}

function IntentBadge({ intent, tooltipPath, tooltipDesc, badgeBg, badgeText, badgeHover, highlight }: IntentBadgeProps) {
  const [visible, setVisible] = useState(false);

  const label = highlight ? highlightMatch(intent, highlight) : <span>{intent}</span>;

  return (
    <div className="relative inline-block">
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-default select-none transition-colors ${badgeBg} ${badgeText} ${badgeHover}`}
      >
        {label}
      </span>

      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none w-72">
          <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2.5 shadow-lg">
            <div className="font-semibold text-slate-300 mb-1">{tooltipPath}</div>
            {tooltipDesc && <div className="text-slate-400 leading-relaxed">{tooltipDesc}.</div>}
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-inherit rounded">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}
