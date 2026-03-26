import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import { SCHOOLS } from "../constants/schools";
import { abbr } from "../utils/helpers";
import { Clock } from "lucide-react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import MarketplaceCard from "../components/MarketplaceCard";
import CategoryGrid from "../components/CategoryGrid";

export default function HomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [marketplaces, setMarketplaces] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [creators, setCreators] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    school: "",
    sort: "recent",
  });
  const [showMarketplaceResults, setShowMarketplaceResults] = useState(false);
  const [pendingBuy, setPendingBuy] = useState([]);
  const [pendingSell, setPendingSell] = useState([]);

  useEffect(() => {
    fetchMarketplaces();
  }, []);

  useEffect(() => {
    const resetHome = () => {
      setSearch("");
      setFilters({ category: "", school: "", sort: "recent" });
      setShowFilters(false);
      setShowSuggestions(false);
      setShowMarketplaceResults(false);
    };
    window.addEventListener("lionslist:reset-home", resetHome);
    return () => window.removeEventListener("lionslist:reset-home", resetHome);
  }, []);

  useEffect(() => {
    if (profile) fetchPending();
  }, [profile]);

  async function fetchPending() {
    // My pending buy requests
    const { data: myRequests } = await supabase
      .from("buy_requests")
      .select("*, listings(id, name, price, category, marketplace_id, seller_id, marketplaces(id, name, code))")
      .eq("buyer_id", profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);
    setPendingBuy(myRequests || []);

    // Pending requests on my listings
    const { data: myListings } = await supabase
      .from("listings")
      .select("id")
      .eq("seller_id", profile.id);
    if (myListings?.length) {
      const { data: incoming } = await supabase
        .from("buy_requests")
        .select("*, listings(id, name, price, category, marketplaces(id, name, code))")
        .in("listing_id", myListings.map((l) => l.id))
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      if (incoming?.length) {
        const buyerIds = [...new Set(incoming.map((r) => r.buyer_id))];
        const { data: buyerProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", buyerIds);
        const map = {};
        (buyerProfiles || []).forEach((p) => (map[p.id] = p.full_name));
        setPendingSell(incoming.map((r) => ({ ...r, buyerName: map[r.buyer_id] || "Unknown" })));
      } else {
        setPendingSell([]);
      }
    }
  }

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

    // Fetch all active listings with images and seller info
    const { data: listings } = await supabase
      .from("listings")
      .select("id, name, price, category, quantity, note, sold, marketplace_id, seller_id, created_at, listing_images(image_url, display_order), profiles(full_name, whatsapp)")
      .eq("sold", false)
      .order("created_at", { ascending: false });
    setAllListings(listings || []);

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
          (m.code || "").toLowerCase().includes(q) ||
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

  // Build a marketplace lookup for listings
  const marketplaceMap = useMemo(() => {
    const map = {};
    for (const m of marketplaces) map[m.id] = m;
    return map;
  }, [marketplaces]);

  // Filtered items as a flat sorted list
  const filteredItems = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    let matching = allListings.filter((l) => {
      if (!l.name.toLowerCase().includes(q)) return false;
      const m = marketplaceMap[l.marketplace_id];
      if (!m || isExpired(m)) return false;
      if (m.school_restrictions?.length > 0 && !m.school_restrictions.includes(profile?.school)) return false;
      if (filters.category && m.category !== filters.category) return false;
      return true;
    });
    if (filters.sort === "popular") {
      matching = [...matching].sort((a, b) => Number(b.price) - Number(a.price));
    } else {
      matching = [...matching].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return matching;
  }, [search, allListings, marketplaceMap, filters, profile]);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!search.trim() || search.trim().length < 2) return [];
    const q = search.trim().toLowerCase();
    const seen = new Set();
    const mktResults = [];
    const itemResults = [];

    for (const m of marketplaces) {
      if (isExpired(m)) continue;
      if (m.name.toLowerCase().includes(q) && !seen.has("m:" + m.id)) {
        seen.add("m:" + m.id);
        const catIcon = CATEGORIES.find((c) => c.name === m.category)?.icon;
        mktResults.push({ type: "marketplace", label: m.name, sub: m.category, icon: catIcon, code: m.code || m.id });
      }
    }
    for (const [id, name] of Object.entries(creators)) {
      if (name.toLowerCase().includes(q) && !seen.has("c:" + id)) {
        seen.add("c:" + id);
        mktResults.push({ type: "creator", label: name, sub: "Creator" });
      }
    }
    for (const l of allListings) {
      if (!l.name.toLowerCase().includes(q)) continue;
      const m = marketplaceMap[l.marketplace_id];
      if (!m || isExpired(m)) continue;
      const price = Number(l.price) === 0 ? "FREE" : `$${Number(l.price).toFixed(0)}`;
      itemResults.push({
        type: "item",
        label: l.name,
        sub: `${price} · in ${m.name}`,
        icon: CATEGORIES.find((c) => c.name === l.category)?.icon,
        code: m.code || m.id,
      });
      if (itemResults.length >= 4) break;
    }
    return [...mktResults.slice(0, 3), ...itemResults];
  }, [search, marketplaces, allListings, marketplaceMap, creators]);

  const handleSuggestionClick = (s) => {
    if (s.type === "marketplace" || s.type === "item") {
      navigate(`/marketplace/${s.code}`);
    } else {
      setSearch(s.label);
      setShowSuggestions(false);
    }
  };

  const activeFilterCount = [filters.category, filters.school].filter(Boolean).length +
    (filters.sort !== "recent" ? 1 : 0);

  const isSearching = search.trim() || filters.category || filters.school || filters.sort !== "recent";

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#9BCBEB] to-[#75B2D6] text-[#002B5C] pt-5 md:pt-6 pb-10 px-6 md:px-10 text-center overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-60px] left-[-40px] w-48 h-48 bg-white/10 rounded-full" />
        <div className="absolute bottom-[-30px] right-[-20px] w-36 h-36 bg-white/10 rounded-full" />
        <div className="absolute top-10 right-[15%] w-20 h-20 bg-white/5 rounded-full" />

        <h1 className="relative text-2xl md:text-4xl font-extrabold tracking-tight" style={{ textShadow: "0 0 8px rgba(255,255,255,0.6), 0 0 2px rgba(255,255,255,0.8)" }}>
          Welcome to LionsList, {profile?.full_name?.split(" ")[0]}!
        </h1>
        <p className="relative text-base md:text-lg mt-1.5 font-medium" style={{ textShadow: "0 0 6px rgba(255,255,255,0.5)" }}>
          Buy, sell, and trade with fellow Columbia Lions
        </p>
        <div className="relative z-10 flex gap-3 justify-center mt-4 pb-2">
          <button
            onClick={() => navigate("/marketplace/create")}
            className="bg-[#002B5C] text-white font-bold px-6 py-2.5 text-sm rounded-lg border-none cursor-pointer shadow-lg hover:bg-[#001F42] hover:shadow-xl hover:-translate-y-0.5 transition-all"
            style={{ boxShadow: "0 0 10px rgba(255,255,255,0.7), 0 4px 12px rgba(0,0,0,0.15)" }}
          >
            + Create Marketplace
          </button>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ marginBottom: "-1px" }}>
            <path d="M0 60V20C240 50 480 0 720 20C960 40 1200 10 1440 30V60H0Z" fill="#F9FAFB" />
          </svg>
        </div>
      </div>

      {/* All content below hero */}
      <div className="max-w-screen-xl mx-auto px-8 py-5 space-y-5">
        {/* Search bar with autocomplete and filters */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                className="w-full border border-gray-300 rounded-full pl-10 pr-10 py-3 bg-white shadow-sm text-sm outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Search by item, marketplace, or creator..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                  setShowMarketplaceResults(false);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => { if (e.key === "Enter") setShowSuggestions(false); }}
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
              {showSuggestions && suggestions.length > 0 && (() => {
                const mktSuggestions = suggestions.filter((s) => s.type === "marketplace" || s.type === "creator");
                const itemSuggestions = suggestions.filter((s) => s.type === "item");
                return (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                    {mktSuggestions.length > 0 && (
                      <>
                        <p className="px-4 pt-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide m-0">Marketplaces</p>
                        {mktSuggestions.map((s, i) => (
                          <button
                            key={"m" + i}
                            onClick={() => handleSuggestionClick(s)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left bg-transparent border-none cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
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
                      </>
                    )}
                    {itemSuggestions.length > 0 && (
                      <>
                        <p className={`px-4 pt-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide m-0 ${mktSuggestions.length > 0 ? "border-t border-gray-100" : ""}`}>Items</p>
                        {itemSuggestions.map((s, i) => (
                          <button
                            key={"i" + i}
                            onClick={() => handleSuggestionClick(s)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left bg-transparent border-none cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                          >
                            <span className="text-lg w-6 text-center shrink-0">
                              {s.icon || "\uD83D\uDCE6"}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{s.label}</p>
                              <p className="text-xs text-gray-400">{s.sub}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-2.5 rounded-full border cursor-pointer transition-colors shrink-0 ${
                showFilters || activeFilterCount > 0
                  ? "bg-[#DCE9F5] border-[#002B5C] text-[#002B5C]"
                  : "bg-white border-gray-300 text-gray-500"
              }`}
            >
              <SlidersHorizontal size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#002B5C] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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

        {/* Collapsible marketplace results — right below search bar */}
        {isSearching && filtered?.length > 0 && filteredItems.length > 0 && (
          <div onClick={() => setShowSuggestions(false)}>
            <button
              onClick={() => setShowMarketplaceResults((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 bg-transparent border-none cursor-pointer p-0 hover:text-gray-900"
            >
              <ChevronDown
                size={16}
                className={`transition-transform ${showMarketplaceResults ? "rotate-0" : "-rotate-90"}`}
              />
              {filtered.length} marketplace{filtered.length !== 1 ? "s" : ""} found
            </button>
            {showMarketplaceResults && (
              <div className="grid gap-4 mt-3">
                {filtered.map((m) => (
                  <MarketplaceCard key={m.id} marketplace={m} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search results */}
        {isSearching && (
          <div onClick={() => setShowSuggestions(false)}>
            {filtered?.length === 0 && filteredItems.length === 0 ? (
              <p className="text-gray-400 text-center py-6">
                No results found{search.trim() ? ` for \u201C${search}\u201D` : ""}
              </p>
            ) : (
              <>
                {/* Marketplace results shown expanded when no items match */}
                {filtered?.length > 0 && filteredItems.length === 0 && (
                  <>
                    <p className="text-sm text-gray-400 mb-3">
                      {filtered.length} marketplace{filtered.length !== 1 ? "s" : ""} found
                    </p>
                    <div className="grid gap-4">
                      {filtered.map((m) => (
                        <MarketplaceCard key={m.id} marketplace={m} />
                      ))}
                    </div>
                  </>
                )}

                {/* Items — flat grid sorted by user preference */}
                {filteredItems.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-3">
                      {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} found
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredItems.map((item) => {
                        const m = marketplaceMap[item.marketplace_id];
                        const catIcon = CATEGORIES.find((c) => c.name === item.category)?.icon;
                        const imgs = (item.listing_images || []).sort((a, b) => a.display_order - b.display_order);
                        const firstImage = imgs[0]?.image_url;
                        const sellerName = item.profiles?.full_name || "Unknown";
                        return (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl overflow-hidden border border-gray-200 transition-all hover:shadow-md"
                          >
                            {firstImage ? (
                              <img src={firstImage} alt={item.name} className="w-full h-[160px] object-cover bg-gray-100" />
                            ) : (
                              <div className="w-full h-[160px] flex items-center justify-center text-4xl text-gray-300 bg-gray-100">
                                {catIcon || "\uD83D\uDCE6"}
                              </div>
                            )}
                            <div className="p-3">
                              <div className="flex justify-between items-start">
                                <h3 className="m-0 text-sm font-semibold truncate">{item.name}</h3>
                                <span className="font-bold text-green-600 text-sm shrink-0 ml-2">
                                  {Number(item.price) === 0 ? "FREE" : `$${Number(item.price).toFixed(0)}`}
                                </span>
                              </div>
                              <div className="flex gap-1.5 mt-1.5 text-xs text-gray-400 flex-wrap">
                                <span>Qty: {item.quantity}</span>
                                <span>·</span>
                                <span>{catIcon} {item.category}</span>
                                <span>·</span>
                                <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                              </div>
                              {item.note && (
                                <p className="text-gray-500 text-xs mt-1.5 leading-relaxed m-0 line-clamp-2">{item.note}</p>
                              )}
                              <div className="mt-2.5 pt-2.5 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                  by <strong>{sellerName}</strong>
                                </span>
                                <button
                                  onClick={() => navigate(`/marketplace/${m?.code || m?.id}`)}
                                  className="text-xs font-semibold text-[#002B5C] bg-transparent border-none cursor-pointer hover:underline p-0"
                                >
                                  View in {m?.name}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            {filters.category && (
              <button
                onClick={() => navigate(`/marketplace/create?category=${encodeURIComponent(filters.category)}`)}
                className="mt-4 w-full py-3 text-sm font-semibold text-[#002B5C] bg-[#DCE9F5] border border-[#002B5C] rounded-lg cursor-pointer hover:bg-[#C5DBE9] transition-colors"
              >
                + Create a new {filters.category} marketplace
              </button>
            )}
          </div>
        )}

        {!isSearching && (
          <>
            {/* Categories */}
            <div>
              <h2 className="text-lg font-bold mb-5">Browse by Category</h2>
              <CategoryGrid onCategoryClick={(cat) => {
                setFilters((f) => ({ ...f, category: cat }));
                setShowFilters(true);
              }} />
            </div>

            {/* Pending */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Clock size={20} className="text-[#002B5C]" /> Pending
                </h2>
                <button
                  onClick={() => navigate("/pending")}
                  className="text-sm text-[#002B5C] font-semibold bg-transparent border-none cursor-pointer hover:underline"
                >
                  View All
                </button>
              </div>
              {pendingBuy.length === 0 && pendingSell.length === 0 ? (
                <Card className="text-center !py-12 text-gray-400">
                  <div className="text-5xl mb-3">🛒</div>
                  <p>You haven't made any buy requests yet.</p>
                  <p className="text-sm">Browse marketplaces and request items you're interested in.</p>
                </Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {pendingSell.map((r) => (
                    <Card
                      key={r.id}
                      hover
                      onClick={() => navigate(`/marketplace/${r.listings?.marketplaces?.code || r.listings?.marketplaces?.id}`)}
                      className="!p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 m-0">
                            {r.listings?.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 m-0">
                            Buyer: <strong>{r.buyerName}</strong>
                          </p>
                        </div>
                        <Badge color="red">Needs Response</Badge>
                      </div>
                    </Card>
                  ))}
                  {pendingBuy.map((r) => (
                    <Card
                      key={r.id}
                      hover
                      onClick={() => navigate(`/marketplace/${r.listings?.marketplaces?.code || r.listings?.marketplaces?.id}`)}
                      className="!p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 m-0">
                            {r.listings?.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 m-0">
                            in {r.listings?.marketplaces?.name}
                          </p>
                        </div>
                        <Badge color="gray">Awaiting Reply</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* My Created */}
            {myCreated.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-5">My Marketplaces</h2>
                <div className="grid gap-4">
                  {myCreated.slice(0, 3).map((m) => (
                    <MarketplaceCard key={m.id} marketplace={m} />
                  ))}
                </div>
                {myCreated.length > 3 && (
                  <button
                    onClick={() => navigate("/marketplace/mine")}
                    className="mt-4 w-full py-2.5 text-sm text-[#002B5C] font-semibold bg-transparent border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    See More
                  </button>
                )}
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
                <>
                  <div className="grid gap-4">
                    {active.slice(0, 3).map((m) => (
                      <MarketplaceCard key={m.id} marketplace={m} />
                    ))}
                  </div>
                  {active.length > 3 && (
                    <button
                      onClick={() => navigate("/marketplace/search")}
                      className="mt-4 w-full py-2.5 text-sm text-[#002B5C] font-semibold bg-transparent border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      See More
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
