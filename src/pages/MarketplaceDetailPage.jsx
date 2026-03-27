import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { abbr } from "../utils/helpers";
import { checkProfanity } from "../utils/profanity";
import { CATEGORIES } from "../constants/categories";
import { SCHOOLS } from "../constants/schools";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import TextArea from "../components/ui/TextArea";
import Select from "../components/ui/Select";
import Field from "../components/ui/Field";
import Toggle from "../components/ui/Toggle";
import ListingCard from "../components/ListingCard";
import CreateListingForm from "../components/CreateListingForm";
import SearchFilters from "../components/SearchFilters";

export default function MarketplaceDetailPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [marketplace, setMarketplace] = useState(null);
  const [listings, setListings] = useState([]);
  const [sellers, setSellers] = useState({});
  const [tab, setTab] = useState("buy");
  const [showCreate, setShowCreate] = useState(false);
  const [newListingId, setNewListingId] = useState(null);
  const [showMktMenu, setShowMktMenu] = useState(false);
  const mktMenuRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    priceMin: "",
    priceMax: "",
    sort: "newest",
  });

  useEffect(() => {
    fetchData();
  }, [code]);

  useEffect(() => {
    if (!showMktMenu) return;
    const close = (e) => { if (mktMenuRef.current && !mktMenuRef.current.contains(e.target)) setShowMktMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showMktMenu]);

  async function fetchData() {
    setLoading(true);
    // Support both code and UUID for backwards compatibility
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
    const { data: mkt } = await supabase
      .from("marketplaces")
      .select("*")
      .eq(isUuid ? "id" : "code", code)
      .single();

    if (!mkt) {
      setLoading(false);
      return;
    }
    setMarketplace(mkt);

    const { data: listingsData } = await supabase
      .from("listings")
      .select("*, listing_images(*)")
      .eq("marketplace_id", mkt.id)
      .order("created_at", { ascending: false });

    setListings(listingsData || []);

    // Fetch seller profiles
    const sellerIds = [...new Set((listingsData || []).map((l) => l.seller_id))];
    if (sellerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", sellerIds);
      const map = {};
      (profiles || []).forEach((p) => (map[p.id] = p));
      setSellers(map);
    }

    // Also fetch marketplace creator profile
    if (mkt.creator_id) {
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", mkt.creator_id)
        .single();
      if (creatorProfile) {
        setSellers((prev) => ({ ...prev, [mkt.creator_id]: { ...prev[mkt.creator_id], ...creatorProfile } }));
      }
    }

    setLoading(false);
  }

  const expired = marketplace?.expiry_date && new Date(marketplace.expiry_date) < new Date();
  const othersActive = useMemo(() => listings.filter((l) => !l.sold && !l.sale_pending && l.seller_id !== profile?.id), [listings, profile]);
  const sold = useMemo(() => listings.filter((l) => l.sold), [listings]);
  const mine = useMemo(() => listings.filter((l) => l.seller_id === profile?.id && !l.sold && !l.sale_pending), [listings, profile]);
  const pendingSale = useMemo(() => listings.filter((l) => l.sale_pending && !l.sold), [listings]);

  const filteredActive = useMemo(() => {
    let items = [...othersActive];
    if (itemSearch.trim()) {
      const q = itemSearch.trim().toLowerCase();
      items = items.filter((l) => l.name.toLowerCase().includes(q));
    }
    if (filters.priceMin) items = items.filter((l) => l.price >= Number(filters.priceMin));
    if (filters.priceMax) items = items.filter((l) => l.price <= Number(filters.priceMax));
    if (filters.sort === "price-asc") items.sort((a, b) => a.price - b.price);
    else if (filters.sort === "price-desc") items.sort((a, b) => b.price - a.price);
    // newest is default order from DB
    return items;
  }, [othersActive, itemSearch, filters]);

  const itemSuggestions = useMemo(() => {
    if (!itemSearch.trim() || itemSearch.trim().length < 2) return [];
    const q = itemSearch.trim().toLowerCase();
    const seen = new Set();
    const results = [];
    for (const l of othersActive) {
      if (!l.name.toLowerCase().includes(q)) continue;
      if (seen.has(l.name.toLowerCase())) continue;
      seen.add(l.name.toLowerCase());
      const catIcon = CATEGORIES.find((c) => c.name === l.category)?.icon;
      const price = Number(l.price) === 0 ? "FREE" : `$${Number(l.price).toFixed(0)}`;
      results.push({ label: l.name, sub: `${price} · ${l.category}`, icon: catIcon });
      if (results.length >= 6) break;
    }
    return results;
  }, [itemSearch, othersActive]);

  const copyLink = async () => {
    const link = `${window.location.origin}/marketplace/${marketplace?.code || marketplace?.id}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markSold = async (listingId, soldPrice) => {
    const update = { sold: true };
    if (soldPrice !== undefined && soldPrice !== null) update.sold_price = Number(soldPrice);
    await supabase.from("listings").update(update).eq("id", listingId);
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, ...update } : l))
    );
  };

  const confirmSale = async (listingId, soldPrice) => {
    const update = { sold: true, sale_pending: false };
    if (soldPrice !== undefined && soldPrice !== null) update.sold_price = Number(soldPrice);
    await supabase.from("listings").update(update).eq("id", listingId);
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, ...update } : l))
    );
  };

  const reactivate = async (listingId) => {
    await supabase.from("listings").update({ sold: false, sold_price: null, sale_pending: false, buyer_id: null }).eq("id", listingId);
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, sold: false, sold_price: null, sale_pending: false, buyer_id: null } : l))
    );
  };

  const isCreator = marketplace?.creator_id === profile?.id;

  const startEdit = () => {
    setEditForm({
      name: marketplace.name,
      category: marketplace.category || "",
      description: marketplace.description,
      pricingMode: marketplace.pricing_mode,
      priceMax: marketplace.price_max || "",
      allowPictures: marketplace.allow_pictures ?? true,
      expiryDate: marketplace.expiry_date || "",
      schoolRestrictions: marketplace.school_restrictions || [],
    });
    setEditing(true);
  };

  const toggleEditSchool = (s) =>
    setEditForm((f) => ({
      ...f,
      schoolRestrictions: f.schoolRestrictions.includes(s)
        ? f.schoolRestrictions.filter((x) => x !== s)
        : [...f.schoolRestrictions, s],
    }));

  const saveEdit = async () => {
    if (!editForm.name.trim() || !editForm.description.trim()) {
      alert("Name and description are required.");
      return;
    }
    const badWord = checkProfanity(editForm.name, editForm.description);
    if (badWord) {
      alert("Please remove offensive language from your marketplace name or description.");
      return;
    }
    if (editForm.pricingMode === "max" && (!editForm.priceMax || Number(editForm.priceMax) <= 0)) {
      alert("Please enter a valid price maximum.");
      return;
    }
    setSaving(true);
    try {
      const updates = {
        name: editForm.name,
        description: editForm.description,
        pricing_mode: editForm.pricingMode,
        price_max: editForm.pricingMode === "max" ? Number(editForm.priceMax) : null,
        allow_pictures: editForm.allowPictures,
        expiry_date: editForm.expiryDate || null,
        school_restrictions: editForm.schoolRestrictions,
      };
      if (editForm.category) updates.category = editForm.category;
      const { error } = await supabase
        .from("marketplaces")
        .update(updates)
        .eq("id", marketplace.id);
      if (error) throw error;
      setMarketplace((m) => ({ ...m, ...updates }));
      setEditing(false);
    } catch (err) {
      alert("Failed to update marketplace: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteMarketplace = async () => {
    if (!window.confirm("Are you sure you want to delete this marketplace? All listings will be removed. This cannot be undone.")) {
      return;
    }
    try {
      const { error } = await supabase.from("marketplaces").delete().eq("id", marketplace.id);
      if (error) throw error;
      navigate("/home");
    } catch (err) {
      alert("Failed to delete marketplace: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-6 text-center text-gray-400">
        Loading...
      </div>
    );
  }

  if (!marketplace) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-6">
        <Card className="text-center !py-12">
          <div className="text-5xl mb-3">🔍</div>
          <h2 className="font-bold">Marketplace Not Found</h2>
          <p className="text-gray-500">This marketplace may have been removed.</p>
          <Button onClick={() => navigate("/home")} className="mt-4">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  const creatorName = sellers[marketplace.creator_id]?.full_name || "Unknown";

  const tabs = [
    { k: "buy", l: "Buy", n: othersActive.length },
    { k: "sell", l: "Sell", n: mine.length },
    { k: "pending_sale", l: "Pending Sale Confirmation", n: pendingSale.length },
    { k: "sold", l: "Sold", n: sold.length },
  ];

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        ← Back to Home
      </button>

      {/* Header */}
      <Card className="mb-6">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold m-0 mb-1">Marketplace</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="m-0 text-2xl text-[#002B5C] font-bold">
                {marketplace.name}
              </h1>
              {expired && <Badge color="red">Archived</Badge>}
            </div>
            <p className="text-gray-500 my-2 leading-relaxed">
              {marketplace.description}
            </p>
            <div className="flex gap-4 text-[13px] text-gray-400 flex-wrap">
              <span>
                Created by <strong>{creatorName}</strong>
              </span>
              <span>
                {marketplace.pricing_mode === "free"
                  ? "Free items only"
                  : marketplace.pricing_mode === "max"
                    ? `Max price: $${marketplace.price_max}`
                    : "Any price"}
              </span>
              {marketplace.expiry_date && (
                <span>
                  {expired ? "Expired" : "Expires"}{" "}
                  {new Date(marketplace.expiry_date).toLocaleDateString()}
                </span>
              )}
            </div>
            {marketplace.school_restrictions?.length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {marketplace.school_restrictions.map((s) => (
                  <Badge key={s}>{abbr(s)}</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="relative" ref={mktMenuRef}>
            <button
              onClick={() => setShowMktMenu((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 border-none cursor-pointer transition-colors"
            >
              <span className="text-gray-500 text-lg leading-none">⋮</span>
            </button>
            {showMktMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 min-w-[200px]">
                {!expired && (
                  <button
                    onClick={() => { setShowMktMenu(false); setShowCreate(true); setTab("sell"); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors text-left"
                  >
                    ➕ New Listing
                  </button>
                )}
                <button
                  onClick={() => { setShowMktMenu(false); copyLink(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors text-left"
                >
                  {copied ? "✓ Copied!" : "🔗 Copy Marketplace Link"}
                </button>
                {isCreator && (
                  <>
                    <button
                      onClick={() => { setShowMktMenu(false); startEdit(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors text-left"
                    >
                      ✏️ Edit Marketplace
                    </button>
                    <button
                      onClick={() => { setShowMktMenu(false); deleteMarketplace(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 bg-transparent border-none cursor-pointer hover:bg-red-50 transition-colors text-left"
                    >
                      🗑️ Delete Marketplace
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Edit form */}
      {editing && (
        <Card className="mb-6">
          <h3 className="m-0 mb-4 text-[#002B5C] font-semibold text-lg">Edit Marketplace</h3>
          <p className="text-xs text-gray-400 mb-4">Changes only apply to new listings. Existing listings are not affected.</p>
          <Input
            label="Marketplace Name"
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Select
            label="Category"
            value={editForm.category}
            onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
          <TextArea
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
          />

          <Field label="Pricing Mode">
            <div className="flex gap-2 flex-wrap">
              {[
                { v: "free", l: "Free Only" },
                { v: "any", l: "Any Price" },
                { v: "max", l: "Price Maximum" },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f, pricingMode: o.v }))}
                  className={`px-4 py-2 rounded-lg border-2 cursor-pointer font-semibold text-[13px] transition-all ${
                    editForm.pricingMode === o.v
                      ? "border-[#002B5C] bg-[#DCE9F5] text-[#002B5C]"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </Field>

          {editForm.pricingMode === "max" && (
            <Input
              label="Maximum Price ($)"
              type="number"
              placeholder="50"
              value={editForm.priceMax}
              onChange={(e) => setEditForm((f) => ({ ...f, priceMax: e.target.value }))}
            />
          )}

          <Toggle
            label="Allow Pictures on Listings"
            checked={editForm.allowPictures}
            onChange={(v) => setEditForm((f) => ({ ...f, allowPictures: v }))}
          />

          <Input
            label="Expiry Date"
            type="date"
            value={editForm.expiryDate}
            onChange={(e) => setEditForm((f) => ({ ...f, expiryDate: e.target.value }))}
          />

          <Field label="Restrict to Specific Schools (optional)">
            <p className="text-gray-400 text-xs m-0 mb-2">
              Leave unselected to allow all Columbia students
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SCHOOLS.map((s) => {
                const sel = editForm.schoolRestrictions.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleEditSchool(s)}
                    className={`px-3 py-1.5 rounded-full border-[1.5px] cursor-pointer text-xs font-semibold transition-all ${
                      sel
                        ? "border-[#002B5C] bg-[#DCE9F5] text-[#002B5C]"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {abbr(s)}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex gap-2 mt-4">
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex border-b-2 border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-6 py-2.5 cursor-pointer font-semibold text-sm border-none bg-transparent transition-all border-b-[3px] ${
              tab === t.k
                ? "border-[#002B5C] text-[#002B5C]"
                : "border-transparent text-gray-500"
            }`}
          >
            {t.l} <Badge color={tab === t.k ? "blue" : "gray"}>{t.n}</Badge>
          </button>
        ))}
      </div>

      {/* Buy Tab */}
      {tab === "buy" && (
        <>
          <SearchFilters
            filters={filters}
            onChange={setFilters}
            itemSearch={itemSearch}
            onItemSearchChange={setItemSearch}
            showItemSuggestions={showItemSuggestions}
            onShowItemSuggestions={setShowItemSuggestions}
            itemSuggestions={itemSuggestions}
          />
          {filteredActive.length === 0 ? (
            <Card className="text-center !py-12 text-gray-400">
              <div className="text-5xl mb-3">🛒</div>
              <p>No active listings yet. Be the first to sell something!</p>
            </Card>
          ) : (
            <div className={marketplace.allow_pictures ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "grid grid-cols-1 gap-3"}>
              {filteredActive.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  marketplace={marketplace}
                  sellerProfile={sellers[l.seller_id]}
                  onMarkSold={markSold}
                  expired={expired}
                  onUpdate={fetchData}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Sell Tab */}
      {tab === "sell" && (
        <div>
          {!expired && showCreate && (
            <CreateListingForm
              marketplace={marketplace}
              onSave={(listingId) => {
                setShowCreate(false);
                setTab("sell");
                setNewListingId(listingId);
                fetchData();
              }}
              onCancel={() => setShowCreate(false)}
            />
          )}
          {!showCreate && !expired && (
            <div className="mb-4">
              <Button onClick={() => setShowCreate(true)}>
                + Create New Listing
              </Button>
            </div>
          )}
          {expired && (
            <Card className="text-center !py-6 text-gray-400 mb-4">
              This marketplace is archived. New listings cannot be created.
            </Card>
          )}
          {mine.length === 0 && !showCreate ? (
            <Card className="text-center !py-12 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p>You haven't listed anything here yet.</p>
            </Card>
          ) : (
            <div className={marketplace.allow_pictures ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "grid grid-cols-1 gap-3"}>
              {mine.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  marketplace={marketplace}
                  sellerProfile={sellers[l.seller_id]}
                  onMarkSold={markSold}
                  expired={expired}
                  onUpdate={fetchData}
                  autoExpand={l.id === newListingId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Sale Tab */}
      {tab === "pending_sale" && (
        pendingSale.length === 0 ? (
          <Card className="text-center !py-12 text-gray-400">
            <div className="text-5xl mb-3">⏳</div>
            <p>No items pending sale confirmation.</p>
          </Card>
        ) : (
          <div className={marketplace.allow_pictures ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "grid grid-cols-1 gap-3"}>
            {pendingSale.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                marketplace={marketplace}
                sellerProfile={sellers[l.seller_id]}
                onMarkSold={(price) => confirmSale(l.id, price)}
                onReactivate={reactivate}
                expired={expired}
                onUpdate={fetchData}
              />
            ))}
          </div>
        )
      )}

      {/* Sold Tab */}
      {tab === "sold" &&
        (sold.length === 0 ? (
          <Card className="text-center !py-12 text-gray-400">
            <div className="text-5xl mb-3">✅</div>
            <p>No sold items yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sold.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                marketplace={marketplace}
                sellerProfile={sellers[l.seller_id]}
                onReactivate={reactivate}
                expired={expired}
                onUpdate={fetchData}
              />
            ))}
          </div>
        ))}
    </div>
  );
}
