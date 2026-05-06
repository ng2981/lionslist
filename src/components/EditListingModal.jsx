import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import { checkProfanity } from "../utils/profanity";
import ImageUpload from "./ImageUpload";
import Button from "./ui/Button";

export default function EditListingModal({ listing, onClose, onSave }) {
  const { profile } = useAuth();
  const images = (listing.listing_images || []).sort(
    (a, b) => a.display_order - b.display_order
  );

  const [form, setForm] = useState({
    name: listing.name,
    price: listing.price,
    quantity: listing.quantity,
    note: listing.note || "",
    category: listing.category,
  });
  const [editImages, setEditImages] = useState(
    images.map((img) => ({
      url: img.image_url,
      preview: img.image_url,
      existing: true,
      id: img.id,
    }))
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      alert("Please enter a listing name.");
      return;
    }
    const badWord = checkProfanity(form.name, form.note);
    if (badWord) {
      alert("Please remove offensive language from your listing.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("listings")
        .update({
          name: form.name,
          price: Number(form.price) || 0,
          quantity: Number(form.quantity) || 1,
          note: form.note || null,
          category: form.category,
        })
        .eq("id", listing.id);
      if (error) throw error;

      // Delete removed existing images
      const keptIds = editImages
        .filter((img) => img.existing)
        .map((img) => img.id);
      const removedImages = images.filter((img) => !keptIds.includes(img.id));
      for (const img of removedImages) {
        await supabase.from("listing_images").delete().eq("id", img.id);
      }

      // Update display_order for existing images
      const keptExisting = editImages.filter((img) => img.existing);
      for (let i = 0; i < keptExisting.length; i++) {
        await supabase
          .from("listing_images")
          .update({ display_order: i })
          .eq("id", keptExisting[i].id);
      }

      // Upload new images
      const newImages = editImages.filter((img) => img.file);
      const startOrder = keptExisting.length;
      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];
        const path = `${profile.id}/${listing.id}/${Date.now()}_${i}`;
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
            display_order: startOrder + i,
          });
        }
      }

      if (onSave) onSave();
      onClose();
    } catch (err) {
      alert("Failed to update listing: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const firstImg = images[0]?.image_url;
  const cat = CATEGORIES.find((c) => c.name === listing.category);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white shadow-xl"
        style={{ borderRadius: "var(--radius-lg, 16px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image */}
        {firstImg ? (
          <img
            src={firstImg}
            alt={listing.name}
            className="w-full object-cover"
            style={{
              height: "180px",
              borderRadius: "var(--radius-lg, 16px) var(--radius-lg, 16px) 0 0",
              background: "var(--surface-2, #f5f5f5)",
            }}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center text-5xl"
            style={{
              height: "140px",
              background: "var(--surface-2, #f5f5f5)",
              borderRadius: "var(--radius-lg, 16px) var(--radius-lg, 16px) 0 0",
              color: "var(--border-strong, #ccc)",
            }}
          >
            {cat?.icon || "📦"}
          </div>
        )}

        {/* Form */}
        <div className="p-5 space-y-3">
          <h3
            className="m-0 text-lg font-bold"
            style={{ color: "var(--columbia-navy, #002B5C)" }}
          >
            Edit Listing
          </h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Name
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C] box-border"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Price ($)
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C] box-border"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
              />
            </div>
            <div className="w-20">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Qty
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C] box-border"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none bg-white focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C] box-border"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C] resize-none box-border"
              rows={3}
              maxLength={200}
              placeholder="Condition, details, etc."
              value={form.note}
              onChange={(e) =>
                setForm((f) => ({ ...f, note: e.target.value }))
              }
            />
            <p className="text-xs text-gray-400 text-right mt-0.5 m-0">
              {form.note.length}/200
            </p>
          </div>

          <ImageUpload images={editImages} onChange={setEditImages} />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" full onClick={onClose}>
              Cancel
            </Button>
            <Button full onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border-none cursor-pointer text-lg transition-colors"
          style={{
            borderRadius: "var(--radius-pill, 50%)",
            background: "rgba(0,0,0,0.4)",
            color: "white",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
