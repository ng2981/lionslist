import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import { SCHOOLS } from "../constants/schools";
import { abbr } from "../utils/helpers";
import MarketplaceCard from "../components/MarketplaceCard";

export default function SearchMarketplacePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const inputRef = useRef(null);

  const [query, setQuery] = useState("");
  const [marketplaces, setMarketplaces] = useState([]);
  const [creators, setCreators] = useState({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    school: "",
    sort: "recent",
  });

  // Fetch all marketplaces + creator profiles once
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("marketplaces")
        .select("*, listings(count)")
        .order("created_at", { ascending: false });

      if (data) {
        const withCount = data.map((m) => ({
          ...m,
          listing_count: m.listings?.[0]?.count ?? 0,
        }));
        setMarketplaces(withCount);

        // Fetch creator profiles
        const ids = [...new Set(data.map((m) => m.creator_id))];
        if (ids.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          if (profiles) {
            const map = {};
            profiles.forEach((p) => (map[p.id] = p.full_name));
            setCreators(map);
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Filter + search logic
  const results = useMemo(() => {
    let list = marketplaces.filter((m) => {
      // Hide expired
      if (m.expiry_date && new Date(m.expiry_date) < new Date()) return false;
      // School restriction
      if (m.school_restrictions?.length > 0) {
        if (!m.school_restrictions.includes(profile?.school)) return false;
      }
      return true;
    });

    // Category filter
    if (filters.category) {
      list = list.filter((m) => m.category === filters.category);
    }

    // School filter
    if (filters.school) {
      list = list.filter((m) =>
        m.school_restrictions?.length === 0 ||
        m.school_restrictions?.includes(filters.school)
      );
    }

    // Text search across name, description, creator name, and ID (for links)
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((m) => {
        const creatorName = creators[m.creator_id] || "";
        return (
          m.name.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          creatorName.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
        );
      });
    }

    // Sort
    if (filters.sort === "popular") {
      list = [...list].sort((a, b) => (b.listing_count ?? 0) - (a.listing_count ?? 0));
    } else {
      list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [marketplaces, creators, query, filters, profile]);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const seen = new Set();
    const items = [];

    // Match marketplace names
    for (const m of marketplaces) {
      if (m.expiry_date && new Date(m.expiry_date) < new Date()) continue;
      if (m.name.toLowerCase().includes(q) && !seen.has("m:" + m.id)) {
        seen.add("m:" + m.id);
        const catIcon = CATEGORIES.find((c) => c.name === m.category)?.icon;
        items.push({ type: "marketplace", label: m.name, sub: m.category, icon: catIcon, id: m.id });
      }
    }

    // Match creator names
    for (const [id, name] of Object.entries(creators)) {
      if (name.toLowerCase().includes(q) && !seen.has("c:" + id)) {
        seen.add("c:" + id);
        items.push({ type: "creator", label: name, sub: "Creator" });
      }
    }

    return items.slice(0, 6);
  }, [query, marketplaces, creators]);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSuggestionClick = (s) => {
    if (s.type === "marketplace") {
      navigate(`/marketplace/${s.id}`);
    } else {
      setQuery(s.label);
      setShowSuggestions(false);
    }
  };

  const activeFilterCount = [filters.category, filters.school].filter(Boolean).length +
    (filters.sort !== "recent" ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 bg-transparent border-none cursor-pointer text-gray-600"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search by name, creator, or link..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-100 border border-gray-200 rounded-full text-sm outline-none focus:border-[#1D4F91] focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setShowSuggestions(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400"
              >
                <X size={16} />
              </button>
            )}

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent border-none cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-lg w-6 text-center shrink-0">
                      {s.icon || (s.type === "creator" ? "\uD83D\uDC64" : "\uD83D\uDCE6")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.label}</p>
                      <p className="text-xs text-gray-400">{s.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-full border cursor-pointer transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-[#E8F4FD] border-[#1D4F91] text-[#1D4F91]"
                : "bg-transparent border-gray-200 text-gray-500"
            }`}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#1D4F91] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none min-w-0 shrink-0"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <select
              value={filters.school}
              onChange={(e) => setFilters((f) => ({ ...f, school: e.target.value }))}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none min-w-0 shrink-0"
            >
              <option value="">All Schools</option>
              {SCHOOLS.map((s) => (
                <option key={s} value={s}>
                  {abbr(s)}
                </option>
              ))}
            </select>
            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none min-w-0 shrink-0"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
            </select>
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters({ category: "", school: "", sort: "recent" })}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-red-500 font-medium cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="px-4 py-4" onClick={() => setShowSuggestions(false)}>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-[#1D4F91] rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{query ? "\uD83D\uDD0D" : "\uD83D\uDED2"}</p>
            <p className="text-gray-500 font-medium">
              {query ? `No marketplaces found for "${query}"` : "Search for a marketplace to sell in"}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {query ? "Try a different name, creator, or category" : "Type a name, creator name, or paste a link"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-3">
              {results.length} marketplace{results.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid gap-3">
              {results.map((m) => (
                <MarketplaceCard key={m.id} marketplace={m} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
