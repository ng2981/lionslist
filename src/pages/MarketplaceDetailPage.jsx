import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { abbr } from "../utils/helpers";
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [marketplace, setMarketplace] = useState(null);
  const [listings, setListings] = useState([]);
  const [sellers, setSellers] = useState({});
  const [tab, setTab] = useState("buy");
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    priceMin: "",
    priceMax: "",
    sort: "newest",
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    const { data: mkt } = await supabase
      .from("marketplaces")
      .select("*")
      .eq("id", id)
      .single();

    if (!mkt) {
      setLoading(false);
      return;
    }
    setMarketplace(mkt);

    const { data: listingsData } = await supabase
      .from("listings")
      .select("*, listing_images(*)")
      .eq("marketplace_id", id)
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
  const active = listings.filter((l) => !l.sold);
  const sold = listings.filter((l) => l.sold);
  const mine = listings.filter((l) => l.seller_id === profile?.id && !l.sold);

  const filteredActive = useMemo(() => {
    let items = [...active];
    if (filters.category) items = items.filter((l) => l.category === filters.category);
    if (filters.priceMin) items = items.filter((l) => l.price >= Number(filters.priceMin));
    if (filters.priceMax) items = items.filter((l) => l.price <= Number(filters.priceMax));
    if (filters.sort === "price-asc") items.sort((a, b) => a.price - b.price);
    else if (filters.sort === "price-desc") items.sort((a, b) => b.price - a.price);
    // newest is default order from DB
    return items;
  }, [active, filters]);

  const copyCode = async () => {
    const code = marketplace?.code || id;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markSold = async (listingId) => {
    await supabase.from("listings").update({ sold: true }).eq("id", listingId);
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, sold: true } : l))
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
        .eq("id", id);
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
      const { error } = await supabase.from("marketplaces").delete().eq("id", id);
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
    { k: "buy", l: "Buy", n: active.length },
    { k: "sell", l: "Sell", n: mine.length },
    { k: "sold", l: "Sold", n: sold.length },
  ];

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none text-[#1D4F91] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        ← Back to Home
      </button>

      {/* Header */}
      <Card className="mb-6">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="m-0 text-2xl text-[#1D4F91] font-bold">
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
          <div className="flex gap-2 flex-wrap">
            <Button small variant="secondary" onClick={copyCode}>
              {copied ? "Copied!" : "📋 Copy ID"}
            </Button>
            {isCreator && (
              <>
                <Button small variant="secondary" onClick={startEdit}>
                  ✏️ Edit
                </Button>
                <Button small variant="danger" onClick={deleteMarketplace}>
                  🗑️ Delete
                </Button>
              </>
            )}
            {!expired && (
              <Button
                small
                onClick={() => {
                  setShowCreate(true);
                  setTab("sell");
                }}
              >
                + New Listing
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Edit form */}
      {editing && (
        <Card className="mb-6">
          <h3 className="m-0 mb-4 text-[#1D4F91] font-semibold text-lg">Edit Marketplace</h3>
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
            <option value="Other">📦 Other</option>
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
                      ? "border-[#1D4F91] bg-[#E8F4FD] text-[#1D4F91]"
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
                        ? "border-[#1D4F91] bg-[#E8F4FD] text-[#1D4F91]"
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
                ? "border-[#1D4F91] text-[#1D4F91]"
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
          <SearchFilters filters={filters} onChange={setFilters} />
          {filteredActive.length === 0 ? (
            <Card className="text-center !py-12 text-gray-400">
              <div className="text-5xl mb-3">🛒</div>
              <p>No active listings yet. Be the first to sell something!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredActive.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  marketplace={marketplace}
                  sellerProfile={sellers[l.seller_id]}
                  expired={expired}
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
              onSave={() => {
                setShowCreate(false);
                setTab("buy");
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mine.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  marketplace={marketplace}
                  sellerProfile={sellers[l.seller_id]}
                  onMarkSold={markSold}
                  expired={expired}
                />
              ))}
            </div>
          )}
        </div>
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
                expired={expired}
              />
            ))}
          </div>
        ))}
    </div>
  );
}
