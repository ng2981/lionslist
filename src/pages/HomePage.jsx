import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import { SCHOOLS } from "../constants/schools";
import { abbr } from "../utils/helpers";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import MarketplaceCard from "../components/MarketplaceCard";
import CategoryGrid from "../components/CategoryGrid";

export default function HomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [marketplaces, setMarketplaces] = useState([]);
  const [creators, setCreators] = useState({});
  const [search, setSearch] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    school: "",
    sort: "recent",
  });

  useEffect(() => {
    fetchMarketplaces();
  }, []);

  async function fetchMarketplaces() {
    const { data } = await supabase
      .from("marketplaces")
      .select("*, listings(count)")
      .order("created_at", { ascending: false });

    const withCounts = (data || []).map((m) => ({
      ...m,
      listing_count: m.listings?.[0]?.count || 0,
    }));
    setMarketplaces(withCounts);

    // Fetch creator profiles
    if (data?.length) {
      const ids = [...new Set(data.map((m) => m.creator_id))];
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

    setLoading(false);
  }

  const visible = marketplaces.filter((m) => {
    if (m.school_restrictions?.length > 0) {
      if (!m.school_restrictions.includes(profile?.school)) return false;
    }
    return true;
  });

  const isExpired = (m) => m.expiry_date && new Date(m.expiry_date) < new Date();
  const myCreated = marketplaces.filter((m) => m.creator_id === profile?.id);
  const active = visible.filter((m) => !isExpired(m));

  // Filtered search results with filters + sorting
  const filtered = useMemo(() => {
    if (!search.trim() && !filters.category && !filters.school && filters.sort === "recent") return null;

    let list = visible.filter((m) => !isExpired(m));

    if (filters.category) {
      list = list.filter((m) => m.category === filters.category);
    }
    if (filters.school) {
      list = list.filter((m) =>
        m.school_restrictions?.length === 0 ||
        m.school_restrictions?.includes(filters.school)
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
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
    if (filters.sort === "popular") {
      list = [...list].sort((a, b) => (b.listing_count ?? 0) - (a.listing_count ?? 0));
    } else {
      list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [visible, creators, search, filters]);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!search.trim() || search.trim().length < 2) return [];
    const q = search.trim().toLowerCase();
    const seen = new Set();
    const items = [];

    for (const m of marketplaces) {
      if (isExpired(m)) continue;
      if (m.name.toLowerCase().includes(q) && !seen.has("m:" + m.id)) {
        seen.add("m:" + m.id);
        const catIcon = CATEGORIES.find((c) => c.name === m.category)?.icon;
        items.push({ type: "marketplace", label: m.name, sub: m.category, icon: catIcon, id: m.id });
      }
    }
    for (const [id, name] of Object.entries(creators)) {
      if (name.toLowerCase().includes(q) && !seen.has("c:" + id)) {
        seen.add("c:" + id);
        items.push({ type: "creator", label: name, sub: "Creator" });
      }
    }
    return items.slice(0, 6);
  }, [search, marketplaces, creators]);

  const handleSuggestionClick = (s) => {
    if (s.type === "marketplace") {
      navigate(`/marketplace/${s.id}`);
    } else {
      setSearch(s.label);
      setShowSuggestions(false);
    }
  };

  const activeFilterCount = [filters.category, filters.school].filter(Boolean).length +
    (filters.sort !== "recent" ? 1 : 0);

  const isSearching = search.trim() || filters.category || filters.school || filters.sort !== "recent";

  const handleJoin = () => {
    const id = joinLink.trim().split("/").pop().split("?")[0];
    if (id) navigate(`/marketplace/${id}`);
    else alert("Please enter a valid marketplace link or ID.");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-blue-700 to-blue-500 text-white py-8 md:py-10 px-6 md:px-10 text-center">
        {/* Decorative circles */}
        <div className="absolute top-[-60px] left-[-40px] w-48 h-48 bg-white/10 rounded-full" />
        <div className="absolute bottom-[-30px] right-[-20px] w-36 h-36 bg-white/10 rounded-full" />
        <div className="absolute top-10 right-[15%] w-20 h-20 bg-white/5 rounded-full" />

        <h1 className="relative text-3xl md:text-5xl font-extrabold tracking-tight">
          Welcome to LionsList, {profile?.full_name?.split(" ")[0]}!
        </h1>
        <p className="relative text-lg md:text-xl opacity-90 mt-3 font-medium">
          Buy, sell, and trade with fellow Columbia Lions
        </p>
        <div className="relative z-10 flex gap-3 justify-center mt-6 pb-4">
          <Button
            onClick={() => navigate("/marketplace/create")}
            className="!bg-white !text-blue-700 !font-bold !px-5 !py-2.5 !text-sm !shadow-lg !border-2 !border-blue-700 hover:!shadow-xl hover:!-translate-y-0.5 !transition-all"
          >
            + Create Marketplace
          </Button>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full z-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 60V20C240 50 480 0 720 20C960 40 1200 10 1440 30V60H0Z" fill="#F9FAFB" />
          </svg>
        </div>
      </div>

      {/* All content below hero */}
      <div className="max-w-screen-xl mx-auto px-8 py-8 space-y-8">
        {/* Join section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="font-semibold text-gray-700 mb-3">Join a Marketplace via Link</p>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Paste marketplace link or ID..."
              value={joinLink}
              onChange={(e) => setJoinLink(e.target.value)}
            />
            <button
              onClick={handleJoin}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium cursor-pointer border-none hover:bg-blue-700 transition-colors"
            >
              Join
            </button>
          </div>
        </div>

        {/* Search bar with autocomplete and filters */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                className="w-full border border-gray-300 rounded-full pl-10 pr-10 py-3 bg-white shadow-sm text-sm outline-none focus:border-[#1D4F91] focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Search by name, creator, or link..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setShowSuggestions(false); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400"
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
              className={`relative p-2.5 rounded-full border cursor-pointer transition-colors shrink-0 ${
                showFilters || activeFilterCount > 0
                  ? "bg-[#E8F4FD] border-[#1D4F91] text-[#1D4F91]"
                  : "bg-white border-gray-300 text-gray-500"
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
            <div className="mt-3 flex gap-2 flex-wrap">
              <select
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
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
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
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
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
              </select>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters({ category: "", school: "", sort: "recent" })}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-red-500 font-medium cursor-pointer whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search results */}
        {isSearching && (
          <div onClick={() => setShowSuggestions(false)}>
            {filtered?.length === 0 ? (
              <p className="text-gray-400 text-center py-6">
                No marketplaces found{search.trim() ? ` for \u201C${search}\u201D` : ""}
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-3">
                  {filtered?.length} marketplace{filtered?.length !== 1 ? "s" : ""} found
                </p>
                <div className="grid gap-4">
                  {filtered?.map((m) => (
                    <MarketplaceCard key={m.id} marketplace={m} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {!isSearching && (
          <>
            {/* Categories */}
            <div>
              <h2 className="text-lg font-bold mb-5">Browse by Category</h2>
              <CategoryGrid onCategoryClick={setSearch} />
            </div>

            {/* My Created */}
            {myCreated.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-5">My Marketplaces</h2>
                <div className="grid gap-4">
                  {myCreated.map((m) => (
                    <MarketplaceCard key={m.id} marketplace={m} />
                  ))}
                </div>
              </div>
            )}

            {/* All Active */}
            <div>
              <h2 className="text-lg font-bold mb-5">All Active Marketplaces</h2>
              {loading ? (
                <p className="text-gray-400 text-center py-8">Loading...</p>
              ) : active.length === 0 ? (
                <Card className="text-center !py-12 text-gray-400">
                  <div className="text-5xl mb-3">🏪</div>
                  <p>No active marketplaces yet. Be the first to create one!</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {active.map((m) => (
                    <MarketplaceCard key={m.id} marketplace={m} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
