import { Search, X } from "lucide-react";

export default function SearchFilters({ filters, onChange, itemSearch, onItemSearchChange, showItemSuggestions, onShowItemSuggestions, itemSuggestions }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
      <div className="relative flex-1 min-w-[160px]">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Search
        </label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-blue-100 transition-all"
            placeholder="Search items..."
            value={itemSearch}
            onChange={(e) => {
              onItemSearchChange(e.target.value);
              onShowItemSuggestions(true);
            }}
            onFocus={() => onShowItemSuggestions(true)}
            onBlur={() => setTimeout(() => onShowItemSuggestions(false), 150)}
            onKeyDown={(e) => { if (e.key === "Enter") onShowItemSuggestions(false); }}
          />
          {itemSearch && (
            <button
              onClick={() => { onItemSearchChange(""); onShowItemSuggestions(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400"
            >
              <X size={14} />
            </button>
          )}
          {showItemSuggestions && itemSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              {itemSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onItemSearchChange(s.label);
                    onShowItemSuggestions(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left bg-transparent border-none cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <span className="text-lg w-6 text-center shrink-0">{s.icon || "\uD83D\uDCE6"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.label}</p>
                    <p className="text-xs text-gray-400">{s.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="w-24">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Min $
        </label>
        <input
          type="number"
          min="0"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none"
          placeholder="0"
          value={filters.priceMin}
          onChange={(e) => update("priceMin", e.target.value)}
        />
      </div>
      <div className="w-24">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Max $
        </label>
        <input
          type="number"
          min="0"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none"
          placeholder="∞"
          value={filters.priceMax}
          onChange={(e) => update("priceMax", e.target.value)}
        />
      </div>
      <div className="min-w-[140px]">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Sort
        </label>
        <select
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none bg-white"
          value={filters.sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
        </select>
      </div>
    </div>
  );
}
