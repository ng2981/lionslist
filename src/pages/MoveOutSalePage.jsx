import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import { checkProfanity } from "../utils/profanity";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import TextArea from "../components/ui/TextArea";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import ImageUpload from "../components/ImageUpload";
import EditListingModal from "../components/EditListingModal";

export default function MoveOutSalePage() {
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const userId = profile?.id || session?.user?.id;
  const [existingSale, setExistingSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [saleTitle, setSaleTitle] = useState("Move Out Sale");
  const [saleDescription, setSaleDescription] = useState("");
  const [items, setItems] = useState([createEmptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkExistingSale();
  }, [profile]);

  async function checkExistingSale() {
    if (!profile) return;
    const { data } = await supabase
      .from("move_out_sales")
      .select("*, listings(*, listing_images(*))")
      .eq("seller_id", userId)
      .eq("active", true)
      .single();

    if (data) {
      setExistingSale(data);
    }
    setLoading(false);
  }

  function createEmptyItem() {
    return {
      id: crypto.randomUUID(),
      name: "",
      category: CATEGORIES[0].name,
      price: "",
      note: "",
      images: [],
    };
  }

  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);

  const removeItem = (id) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id, key, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!userId) {
      alert("Something went wrong. Please refresh and try again.");
      return;
    }

    // Validate
    for (const item of items) {
      if (!item.name.trim()) {
        alert("Please fill in the name for all items.");
        return;
      }
      if (!item.price && item.price !== 0) {
        alert(`Please set a price for "${item.name}".`);
        return;
      }
      const badWord = checkProfanity(item.name, item.note);
      if (badWord) {
        alert(`Please remove offensive language from "${item.name}".`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Create the move out sale
      const { data: sale, error: saleError } = await supabase
        .from("move_out_sales")
        .insert({
          seller_id: userId,
          title: saleTitle.trim() || "Move Out Sale",
          description: saleDescription.trim() || null,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create each listing
      for (const item of items) {
        const { data: listing, error: listingError } = await supabase
          .from("listings")
          .insert({
            name: item.name,
            category: item.category,
            quantity: 1,
            price: Number(item.price) || 0,
            note: item.note || null,
            marketplace_id: null,
            move_out_sale_id: sale.id,
            seller_id: userId,
          })
          .select()
          .single();

        if (listingError) throw listingError;

        // Upload images for this item
        for (let i = 0; i < item.images.length; i++) {
          const img = item.images[i];
          if (!img.file) continue;
          const path = `${userId}/${listing.id}/${Date.now()}_${i}`;
          const { error: uploadError } = await supabase.storage
            .from("listing-images")
            .upload(path, img.file, { contentType: img.file.type });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("listing-images")
              .getPublicUrl(path);

            await supabase.from("listing_images").insert({
              listing_id: listing.id,
              image_url: urlData.publicUrl,
              display_order: i,
            });
          }
        }
      }

      navigate("/home");
    } catch (err) {
      console.error("Failed to create move out sale:", err);
      alert("Failed to create move out sale: " + (err.message || "Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSaleItem = async (id) => {
    if (!window.confirm("Delete this item? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
      setExistingSale((prev) => ({
        ...prev,
        listings: prev.listings.filter((l) => l.id !== id),
      }));
    } catch (err) {
      alert("Failed to delete item: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const endSale = async () => {
    if (!window.confirm("End your move out sale? Unsold items will remain in their categories.")) return;
    await supabase.from("move_out_sales").update({ active: false }).eq("id", existingSale.id);
    setExistingSale(null);
  };

  if (loading) {
    return (
      <div className="max-w-[960px] mx-auto px-4 py-6 text-center text-gray-400">
        Loading...
      </div>
    );
  }

  // Show existing sale if one is active
  if (existingSale) {
    const saleListings = existingSale.listings || [];
    return (
      <div className="max-w-[960px] mx-auto px-4 py-6">
        <button
          onClick={() => navigate("/home")}
          className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
        >
          &larr; Back to Home
        </button>
        <Card>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-[#002B5C] m-0 font-bold">{existingSale.title}</h2>
              {existingSale.description && (
                <p className="text-sm text-gray-500 mt-1 mb-0">{existingSale.description}</p>
              )}
            </div>
            <Button variant="secondary" onClick={endSale}>
              End Sale
            </Button>
          </div>
          <p className="text-sm text-gray-500 mb-4">{saleListings.length} item{saleListings.length !== 1 ? "s" : ""} listed</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {saleListings.map((l) => {
              const imgs = (l.listing_images || []).sort((a, b) => a.display_order - b.display_order);
              const firstImage = imgs[0]?.image_url;
              const catIcon = CATEGORIES.find((c) => c.name === l.category)?.icon;
              return (
                <div key={l.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all" onClick={() => setEditingListing(l)}>
                  {firstImage ? (
                    <img src={firstImage} alt={l.name} className="w-full h-[120px] object-cover" />
                  ) : (
                    <div className="w-full h-[120px] flex items-center justify-center text-3xl text-gray-300 bg-gray-100">
                      {catIcon || "\uD83D\uDCE6"}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="m-0 text-sm font-semibold truncate">{l.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-400">{l.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-green-600">
                          {Number(l.price) === 0 ? "FREE" : `$${Number(l.price).toFixed(0)}`}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSaleItem(l.id); }}
                          disabled={deletingId === l.id}
                          title="Delete item"
                          className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 bg-transparent border-none cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {l.sold && <span className="text-xs text-gray-400 font-semibold">(SOLD)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {editingListing && (
          <EditListingModal
            listing={editingListing}
            onClose={() => setEditingListing(null)}
            onSave={() => { checkExistingSale(); setEditingListing(null); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        &larr; Back to Home
      </button>
      <Card className="max-w-[700px] mx-auto">
        <h2 className="text-[#002B5C] m-0 mb-1 font-bold">Move Out Sale</h2>
        <p className="text-sm text-gray-500 mt-0 mb-6">
          List multiple items at once. They'll appear as a bundle and also show up in their individual categories.
        </p>

        <form onSubmit={submit}>
          <Input
            label="Sale Title"
            placeholder="e.g., Moving out of Schapiro — everything must go!"
            value={saleTitle}
            onChange={(e) => setSaleTitle(e.target.value)}
          />
          <TextArea
            label="Description (optional)"
            placeholder="Anything buyers should know about your sale..."
            value={saleDescription}
            maxLength={200}
            onChange={(e) => setSaleDescription(e.target.value)}
          />

          <hr className="my-6 border-gray-200" />

          <h3 className="text-[#002B5C] font-semibold text-base m-0 mb-4">Items ({items.length})</h3>

          {items.map((item, idx) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-600">Item {idx + 1}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-red-500 font-semibold bg-transparent border-none cursor-pointer hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <Input
                label="Item Name"
                placeholder="e.g., IKEA Desk"
                value={item.name}
                onChange={(e) => updateItem(item.id, "name", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Category"
                  value={item.category}
                  onChange={(e) => updateItem(item.id, "category", e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Price ($)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={item.price}
                  onChange={(e) => updateItem(item.id, "price", e.target.value)}
                />
              </div>
              <TextArea
                label="Description (optional)"
                placeholder="Condition, dimensions, etc."
                value={item.note}
                maxLength={200}
                onChange={(e) => updateItem(item.id, "note", e.target.value)}
              />
              <ImageUpload
                images={item.images}
                onChange={(imgs) => updateItem(item.id, "images", imgs)}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="w-full py-3 text-sm font-semibold text-[#002B5C] bg-[#DCE9F5] border border-dashed border-[#002B5C] rounded-lg cursor-pointer hover:bg-[#C5DBE9] transition-colors mb-4"
          >
            + Add Another Item
          </button>

          <div className="flex gap-2 mt-4">
            <Button type="button" variant="secondary" full onClick={() => navigate("/home")}>
              Cancel
            </Button>
            <Button type="submit" full disabled={submitting}>
              {submitting ? "Creating Sale..." : `List ${items.length} Item${items.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
