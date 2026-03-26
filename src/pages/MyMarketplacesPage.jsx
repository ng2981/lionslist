import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import MarketplaceCard from "../components/MarketplaceCard";

export default function MyMarketplacesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [marketplaces, setMarketplaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    sort: "recent",
    status: "",
  });

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  async function fetchData() {
    const { data } = await supabase
      .from("marketplaces")
      .select("*, listings(count)")
      .eq("creator_id", profile.id)
      .order("created_at", { ascending: false });

    setMarketplaces(
      (data || []).map((m) => ({
        ...m,
        listing_count: m.listings?.[0]?.count ?? 0,
      }))
    );
    setLoading(false);
  }

  const results = useMemo(() => {
    let list = [...marketplaces];

    if (filters.category) {
      list = list.filter((m) => m.category === filters.category);
    }
    if (filters.status === "active") {
      list = list.filter((m) => !m.expiry_date || new Date(m.expiry_date) >= new Date());
    } else if (filters.status === "archived") {
      list = list.filter((m) => m.expiry_date && new Date(m.expiry_date) < new Date());
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        (m.code || "").toLowerCase().includes(q)
      );
    }
    if (filters.sort === "popular") {
      list.sort((a, b) => (b.listing_count ?? 0) - (a.listing_count ?? 0));
    }
    return list;
  }, [marketplaces, query, filters]);

  const activeFilterCount = [filters.category, filters.status].filter(Boolean).length +
    (filters.sort !== "recent" ? 1 : 0);

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        <span className="flex items-center gap-1">
          <ArrowLeft size={16} /> Back
        </span>
      </button>

      <h1 className="text-2xl font-bold text-[#002B5C] m-0 mb-6">My Marketplaces</h1>

      {/* Search + Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="w-full border border-gray-300 rounded-full pl-10 pr-10 py-3 bg-white shadow-sm text-sm outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="Search my marketplaces..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400"
              >
                <X size={16} />
              </button>
            )}
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

        {showFilters && (
          <div className="mt-3 flex gap-2 flex-wrap">
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
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
                onClick={() => setFilters({ category: "", sort: "recent", status: "" })}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-red-500 font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-[#002B5C] rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">{query ? "\uD83D\uDD0D" : "\uD83C\uDFEA"}</p>
          <p className="text-gray-500 font-medium">
            {query ? `No marketplaces found for "${query}"` : "You haven't created any marketplaces yet."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-3">
            {results.length} marketplace{results.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-4">
            {results.map((m) => (
              <MarketplaceCard key={m.id} marketplace={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
