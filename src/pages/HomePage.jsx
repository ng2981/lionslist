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
        .select("id, full_name")
        .in("id", sellerIds);
      if (profiles) {
        const map = {};
        profiles.forEach((p) => (map[p.id] = p.full_name));
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
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#9BCBEB] to-[#75B2D6] text-[#002B5C] pt-5 md:pt-6 pb-10 px-6 md:px-10 text-center overflow-hidden">
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
            onClick={() => navigate("/sell")}
            className="bg-[#002B5C] text-white font-bold px-6 py-2.5 text-sm rounded-lg border-none cursor-pointer shadow-lg hover:bg-[#001F42] hover:shadow-xl hover:-translate-y-0.5 transition-all"
            style={{ boxShadow: "0 0 10px rgba(255,255,255,0.7), 0 4px 12px rgba(0,0,0,0.15)" }}
          >
            + Sell an Item
          </button>
          <button
            onClick={() => navigate("/move-out-sale")}
            className="bg-white text-[#002B5C] font-bold px-6 py-2.5 text-sm rounded-lg border-2 border-[#002B5C] cursor-pointer shadow-lg hover:bg-gray-50 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            📦 Move Out Sale
          </button>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block" preserveAspectRatio="none" style={{ marginBottom: "-1px" }}>
            <path d="M0 60V20C240 50 480 0 720 20C960 40 1200 10 1440 30V60H0Z" fill="#F9FAFB" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-8 py-5 space-y-5">
        {/* Search */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                className="w-full border border-gray-300 rounded-full pl-10 pr-10 py-3 bg-white shadow-sm text-sm outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
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
                  <option key={c.name} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
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
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none w-20"
              />
              <input
                type="number"
                placeholder="Max $"
                value={filters.priceMax}
                onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none w-20"
              />
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters({ category: "", sort: "recent", priceMin: "", priceMax: "" })}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-red-500 font-medium cursor-pointer whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Top Categories */}
        <div>
          <h2 className="text-lg font-bold mb-4">Browse by Category</h2>
          <CategoryGrid onCategoryClick={(cat) => navigate(`/category/${encodeURIComponent(cat)}`)} />
        </div>

        {/* Trending Items */}
        {trendingItems.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-[#002B5C]" /> Trending Items
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {trendingItems.map((item) => (
                <ItemCard key={item.id} item={item} sellers={sellers} navigate={navigate} showRequests />
              ))}
            </div>
          </div>
        )}

        {/* Pending */}
        {(pendingBuy.length > 0 || pendingSell.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-4">
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
                        className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-semibold bg-[#DCE9F5] text-[#002B5C] border border-[#9BCBEB] rounded-lg cursor-pointer hover:bg-[#C5DBE9] transition-colors"
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
          <h2 className="text-lg font-bold mb-4">
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
                <ItemCard key={item.id} item={item} sellers={sellers} navigate={navigate} />
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
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100"
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
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100"
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
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#002B5C] border-none rounded-lg cursor-pointer hover:bg-[#001F42] transition-colors"
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
                className="w-full py-2.5 text-sm font-semibold text-[#002B5C] bg-[#DCE9F5] border-none rounded-lg cursor-pointer hover:bg-[#C5DBE9] transition-colors"
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

function ItemCard({ item, sellers, navigate, showRequests }) {
  const catIcon = CATEGORIES.find((c) => c.name === item.category)?.icon;
  const imgs = (item.listing_images || []).sort((a, b) => a.display_order - b.display_order);
  const firstImage = imgs[0]?.image_url;
  const sellerName = sellers[item.seller_id] || "Unknown";

  return (
    <div
      className="bg-white rounded-xl overflow-hidden border border-gray-200 transition-all hover:shadow-md cursor-pointer"
      onClick={() => navigate(`/category/${encodeURIComponent(item.category)}`)}
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
          <span>{catIcon} {item.category}</span>
          <span>·</span>
          <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          {showRequests && item.requestCount && (
            <>
              <span>·</span>
              <span className="text-amber-600 font-semibold">{item.requestCount} request{item.requestCount !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
        {item.note && (
          <p className="text-gray-500 text-xs mt-1.5 leading-relaxed m-0 line-clamp-2">{item.note}</p>
        )}
        <div className="mt-2.5 pt-2.5 border-t border-gray-100">
          <span className="text-xs text-gray-500">by <strong>{sellerName}</strong></span>
        </div>
      </div>
    </div>
  );
}
