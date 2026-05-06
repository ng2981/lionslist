import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X, TrendingUp, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import CategoryGrid from "../components/CategoryGrid";
import ListingDetailModal from "../components/ListingDetailModal";

export default function HomePage() {
  const { profile, refreshPending } = useAuth();
  const navigate = useNavigate();
  const [allListings, setAllListings] = useState([]);
  const [sellers, setSellers] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    sort: "recent",
    priceMin: "",
    priceMax: "",
  });
  const [pendingBuy, setPendingBuy] = useState([]);
  const [pendingSell, setPendingSell] = useState([]);
  const [trendingItems, setTrendingItems] = useState([]);
  const [cancelRequest, setCancelRequest] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelOther, setCancelOther] = useState("");
  const [remindRequest, setRemindRequest] = useState(null);
  const [homeToast, setHomeToast] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (profile) fetchPending();
  }, [profile]);

  useEffect(() => {
    const resetHome = () => {
      setSearch("");
      setFilters({ category: "", sort: "recent", priceMin: "", priceMax: "" });
      setShowFilters(false);
    };
    window.addEventListener("lionslist:reset-home", resetHome);
    return () => window.removeEventListener("lionslist:reset-home", resetHome);
  }, []);

  async function fetchPending() {
    const { data: myRequests } = await supabase
      .from("buy_requests")
      .select("*, listings(id, name, price, category, seller_id)")
      .eq("buyer_id", profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    if (myRequests?.length) {
      const sellerIds = [...new Set(myRequests.map((r) => r.listings?.seller_id).filter(Boolean))];
      if (sellerIds.length) {
        const { data: sellerProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, whatsapp")
          .in("id", sellerIds);
        const sellerMap = {};
        (sellerProfiles || []).forEach((p) => (sellerMap[p.id] = p));
        setPendingBuy(myRequests.map((r) => ({ ...r, sellerProfile: sellerMap[r.listings?.seller_id] })));
      } else {
        setPendingBuy(myRequests);
      }
    } else {
      setPendingBuy([]);
    }

    const { data: myListings } = await supabase
      .from("listings")
      .select("id")
      .eq("seller_id", profile.id);
    if (myListings?.length) {
      const { data: incoming } = await supabase
        .from("buy_requests")
        .select("*, listings(id, name, price, category)")
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

  async function fetchListings() {
    const { data: listings } = await supabase
      .from("listings")
      .select("id, name, price, category, quantity, note, sold, sale_pending, seller_id, created_at, listing_images(image_url, display_order)")
      .eq("sold", false)
      .eq("sale_pending", false)
      .order("created_at", { ascending: false });

    setAllListings(listings || []);

    // Trending items
    const { data: requestCounts } = await supabase
      .from("buy_requests")
      .select("listing_id");
    if (requestCounts?.length && listings?.length) {
      const countMap = {};
      requestCounts.forEach((r) => {
        countMap[r.listing_id] = (countMap[r.listing_id] || 0) + 1;
      });
      const trending = listings
        .filter((l) => countMap[l.id])
        .map((l) => ({ ...l, requestCount: countMap[l.id] }))
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 6);
      setTrendingItems(trending);
    }

    // Fetch seller profiles
    const sellerIds = [...new Set((listings || []).map((l) => l.seller_id))];
    if (sellerIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, whatsapp")
        .in("id", sellerIds);
      if (profiles) {
        const map = {};
        profiles.forEach((p) => (map[p.id] = p));
        setSellers(map);
      }
    }

    setLoading(false);
  }

  // Filtered item feed
  const feedItems = useMemo(() => {
    let items = [...allListings];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((l) => l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q));
    }
    if (filters.category) {
      items = items.filter((l) => l.category === filters.category);
    }
    if (filters.priceMin) {
      items = items.filter((l) => l.price >= Number(filters.priceMin));
    }
    if (filters.priceMax) {
      items = items.filter((l) => l.price <= Number(filters.priceMax));
    }

    if (filters.sort === "price-asc") items.sort((a, b) => a.price - b.price);
    else if (filters.sort === "price-desc") items.sort((a, b) => b.price - a.price);
    else items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return items;
  }, [allListings, search, filters]);

  const activeFilterCount = [filters.category, filters.priceMin, filters.priceMax].filter(Boolean).length +
    (filters.sort !== "recent" ? 1 : 0);

  return (
    <div style={{ background: 'var(--bg)' }} className="min-h-screen">
      {/* Hero */}
      <div className="hero-section pt-8 md:pt-10 pb-12 px-6 md:px-10 text-center">
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="eyebrow" style={{ color: 'var(--columbia-blue)', marginBottom: '8px' }}>Columbia University Marketplace</p>
          <h1 className="display-text text-3xl md:text-4xl text-white m-0">
            Welcome back, {profile?.full_name?.split(" ")[0]}
          </h1>
          <p className="text-base mt-2 mb-0" style={{ color: 'var(--columbia-blue)', fontWeight: 400 }}>
            Buy, sell, and trade with fellow Columbia Lions
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-8 mt-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>{allListings.length}</div>
              <div className="text-xs" style={{ color: 'var(--columbia-blue)' }}>Active Listings</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(185,217,235,0.2)' }} />
            <div className="text-center">
              <div className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>{Object.keys(sellers).length}</div>
              <div className="text-xs" style={{ color: 'var(--columbia-blue)' }}>Sellers</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(185,217,235,0.2)' }} />
            <div className="text-center">
              <div className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>&lt;2h</div>
              <div className="text-xs" style={{ color: 'var(--columbia-blue)' }}>Avg Response</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/sell")}
              className="btn-primary-navy"
              style={{ background: 'white', color: 'var(--columbia-navy)' }}
            >
              + Sell an Item
            </button>
            <button
              onClick={() => navigate("/move-out-sale")}
              className="btn-secondary-outline"
              style={{ borderColor: 'rgba(185,217,235,0.3)', color: 'white', background: 'transparent' }}
            >
              📦 Move Out Sale
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-8 space-y-8">
        {/* Search */}
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1" style={{ maxWidth: '560px' }}>
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-subtle)' }} />
              <input
                className="w-full pl-10 pr-10 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid transparent',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text)',
                }}
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={(e) => { e.target.style.background = 'var(--surface)'; e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'var(--shadow-sm)'; }}
                onBlur={(e) => { e.target.style.background = 'var(--surface-2)'; e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'none'; }}
              />
              {search ? (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  <X size={16} />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-subtle)', fontFamily: 'monospace' }}>/</kbd>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0 transition-all"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${showFilters || activeFilterCount > 0 ? 'var(--columbia-navy)' : 'var(--border)'}`,
                background: showFilters || activeFilterCount > 0 ? 'var(--columbia-blue)' : 'var(--surface)',
                color: showFilters || activeFilterCount > 0 ? 'var(--columbia-navy)' : 'var(--text-muted)',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <SlidersHorizontal size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center" style={{ background: 'var(--columbia-navy)', color: 'white' }}>
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
                className="px-3 py-2 text-sm outline-none"
                style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
                className="px-3 py-2 text-sm outline-none"
                style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="recent">Most Recent</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <input
                type="number"
                placeholder="Min $"
                value={filters.priceMin}
                onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))}
                className="px-3 py-2 text-sm outline-none w-20"
                style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              />
              <input
                type="number"
                placeholder="Max $"
                value={filters.priceMax}
                onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))}
                className="px-3 py-2 text-sm outline-none w-20"
                style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
              />
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters({ category: "", sort: "recent", priceMin: "", priceMax: "" })}
                  className="px-3 py-2 text-sm font-medium cursor-pointer whitespace-nowrap bg-transparent"
                  style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', color: '#ef4444' }}
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Top Categories */}
        <div>
          <h2 className="display-text text-lg mb-4" style={{ color: 'var(--text)' }}>Browse by Category</h2>
          <CategoryGrid onCategoryClick={(cat) => navigate(`/category/${encodeURIComponent(cat)}`)} />
        </div>

        {/* Lion Hunt CTA */}
        <div
          className="flex items-center justify-between p-5 cursor-pointer transition-all"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            borderLeft: "4px solid var(--columbia-navy)",
          }}
          onClick={() => navigate("/lion-hunt")}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: "48px", height: "48px", borderRadius: "var(--radius)", background: "var(--columbia-blue)", fontSize: "24px" }}
            >
              🦁
            </div>
            <div>
              <h3 className="display-text text-base m-0" style={{ color: "var(--text)" }}>Lion Hunt</h3>
              <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
                Can't find what you need? Post a request and let sellers come to you.
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold shrink-0" style={{ color: "var(--columbia-navy)" }}>Browse &rarr;</span>
        </div>

        {/* Trending Items */}
        {trendingItems.length > 0 && (
          <div>
            <h2 className="display-text text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <TrendingUp size={20} style={{ color: 'var(--columbia-navy)' }} /> Trending Items
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {trendingItems.map((item) => (
                <ItemCard key={item.id} item={item} sellers={sellers} onClick={() => setSelectedListing(item)} showRequests />
              ))}
            </div>
          </div>
        )}

        {/* Pending */}
        {(pendingBuy.length > 0 || pendingSell.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="display-text text-lg flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Clock size={20} style={{ color: 'var(--columbia-navy)' }} /> Pending
              </h2>
              <button
                onClick={() => navigate("/pending")}
                className="text-sm text-[#002663] font-semibold bg-transparent border-none cursor-pointer hover:underline"
              >
                View All
              </button>
            </div>
            <div className="grid gap-3">
              {pendingSell.map((r) => (
                <Card key={r.id} hover onClick={() => navigate(`/category/${encodeURIComponent(r.listings?.category)}`)} className="!p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 m-0">{r.listings?.name}</p>
                      <p className="text-xs text-gray-400 mt-1 m-0">Buyer: <strong>{r.buyerName}</strong></p>
                    </div>
                    <Badge color="red">Needs Response</Badge>
                  </div>
                </Card>
              ))}
              {pendingBuy.map((r) => (
                <Card key={r.id} className="!p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 m-0">{r.listings?.name}</p>
                      <p className="text-xs text-gray-400 mt-1 m-0">in {r.listings?.category}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => setRemindRequest(r)}
                        className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                      >
                        Report as Sold
                      </button>
                      <button
                        onClick={() => setCancelRequest(r)}
                        className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-semibold bg-[#DCE9F5] text-[#002663] border border-[#9BCBEB] rounded-lg cursor-pointer hover:bg-[#C5DBE9] transition-colors"
                      >
                        Cancel Request
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Item Feed */}
        <div>
          <h2 className="display-text text-lg mb-4" style={{ color: 'var(--text)' }}>
            {search.trim() || activeFilterCount > 0 ? `Results (${feedItems.length})` : "Recent Listings"}
          </h2>
          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading...</p>
          ) : feedItems.length === 0 ? (
            <Card className="text-center !py-12 text-gray-400">
              <div className="text-5xl mb-3">🛒</div>
              <p>No items found{search.trim() ? ` for "${search}"` : ""}.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {feedItems.slice(0, 24).map((item) => (
                <ItemCard key={item.id} item={item} sellers={sellers} onClick={() => setSelectedListing(item)} />
              ))}
            </div>
          )}
          {feedItems.length > 24 && (
            <p className="text-center text-sm text-gray-400 mt-4">
              Showing 24 of {feedItems.length} items. Use search or filters to narrow results.
            </p>
          )}
        </div>
      </div>

      {/* Listing Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          seller={sellers[selectedListing.seller_id]}
          onClose={() => setSelectedListing(null)}
          onDelete={(id) => {
            setAllListings((prev) => prev.filter((l) => l.id !== id));
            setTrendingItems((prev) => prev.filter((l) => l.id !== id));
          }}
        />
      )}

      {/* Cancel Request Modal */}
      {cancelRequest && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setCancelRequest(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 m-0 mb-1">Cancel this request?</h3>
            <p className="text-sm text-gray-500 mt-0 mb-1">Reason to cancel</p>
            <div className="mb-4 space-y-3">
              <select
                value={cancelReason}
                onChange={(e) => { setCancelReason(e.target.value); if (e.target.value !== "Other") setCancelOther(""); }}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 outline-none focus:border-[#002663] focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select a reason...</option>
                <option value="Seller is not responding">Seller is not responding</option>
                <option value="Changed my mind">Changed my mind</option>
                <option value="Bought another item">Bought another item</option>
                <option value="Requested by accident">Requested by accident</option>
                <option value="Other">Other</option>
              </select>
              {cancelReason === "Other" && (
                <input
                  type="text"
                  placeholder="Please specify (optional)"
                  value={cancelOther}
                  onChange={(e) => setCancelOther(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 outline-none focus:border-[#002663] focus:ring-2 focus:ring-blue-100"
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  await supabase.from("buy_requests").delete().eq("id", cancelRequest.id);
                  setPendingBuy((prev) => prev.filter((r) => r.id !== cancelRequest.id));
                  setCancelRequest(null);
                  setCancelReason("");
                  setCancelOther("");
                  refreshPending();
                }}
                disabled={!cancelReason}
                className="w-full py-2.5 text-sm font-semibold text-white bg-red-500 border-none rounded-lg cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel Request
              </button>
              <button
                onClick={() => { setCancelRequest(null); setCancelReason(""); setCancelOther(""); }}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#002663] border-none rounded-lg cursor-pointer hover:bg-[#001F42] transition-colors"
              >
                Keep Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report as Sold Modal */}
      {remindRequest && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setRemindRequest(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 m-0 mb-1">Report as Sold</h3>
            <p className="text-sm text-gray-500 mt-0 mb-4">Did you buy <strong>{remindRequest.listings?.name}</strong>?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  const req = remindRequest;
                  setRemindRequest(null);
                  await supabase.from("listings").update({ sale_pending: true, buyer_id: profile.id }).eq("id", req.listings?.id);
                  await supabase.from("buy_requests").delete().eq("id", req.id);
                  setPendingBuy((prev) => prev.filter((r) => r.id !== req.id));
                  refreshPending();
                  setHomeToast("This item will appear as pending until the seller confirms."); setTimeout(() => setHomeToast(null), 4000);
                }}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#25D366] border-none rounded-lg cursor-pointer hover:bg-[#1fb855] transition-colors"
              >
                I bought this item
              </button>
              <button
                onClick={async () => {
                  const req = remindRequest;
                  setRemindRequest(null);
                  await supabase.from("listings").update({ sale_pending: true }).eq("id", req.listings?.id);
                  await supabase.from("buy_requests").delete().eq("id", req.id);
                  setPendingBuy((prev) => prev.filter((r) => r.id !== req.id));
                  refreshPending();
                  setHomeToast("Thanks for letting us know!"); setTimeout(() => setHomeToast(null), 3000);
                }}
                className="w-full py-2.5 text-sm font-semibold text-[#002663] bg-[#DCE9F5] border-none rounded-lg cursor-pointer hover:bg-[#C5DBE9] transition-colors"
              >
                Someone else bought it
              </button>
              <button onClick={() => setRemindRequest(null)} className="w-full py-2 text-sm text-gray-400 bg-transparent border-none cursor-pointer hover:text-gray-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {homeToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white px-6 py-3 rounded-xl shadow-xl text-sm font-medium" onClick={() => setHomeToast(null)}>
          {homeToast}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, sellers, onClick, showRequests }) {
  const catIcon = CATEGORIES.find((c) => c.name === item.category)?.icon;
  const imgs = (item.listing_images || []).sort((a, b) => a.display_order - b.display_order);
  const firstImage = imgs[0]?.image_url;
  const seller = sellers[item.seller_id];
  const sellerName = seller?.full_name || "Unknown";
  const isFree = Number(item.price) === 0;

  return (
    <div className="listing-card" onClick={onClick}>
      {firstImage ? (
        <img src={firstImage} alt={item.name} className="card-thumb" />
      ) : (
        <div className="card-thumb-placeholder">
          {catIcon || "\uD83D\uDCE6"}
        </div>
      )}
      <div className="card-body">
        <div className="flex justify-between items-start gap-2">
          <h3 className="card-title">{item.name}</h3>
          <span className={`card-price ${isFree ? 'free' : ''}`}>
            {isFree ? "FREE" : `$${Number(item.price).toFixed(0)}`}
          </span>
        </div>
        <div className="card-meta">
          <span>{catIcon} {item.category}</span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          {showRequests && item.requestCount && (
            <>
              <span style={{ color: 'var(--border-strong)' }}>·</span>
              <span style={{ color: '#d97706', fontWeight: 600 }}>{item.requestCount} request{item.requestCount !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
        {item.note && (
          <p className="card-blurb">{item.note}</p>
        )}
        <div className="card-footer">
          <div className="card-avatar">{(sellerName)[0].toUpperCase()}</div>
          <span className="card-seller">{sellerName}</span>
        </div>
      </div>
    </div>
  );
}
