import { useState } from "react";
import { CATEGORIES } from "../constants/categories";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { moderateContent } from "../lib/moderation";
import { validateListing } from "../utils/validators";
import { checkProfanity } from "../utils/profanity";
import Input from "./ui/Input";
import TextArea from "./ui/TextArea";
import Select from "./ui/Select";
import Button from "./ui/Button";
import Card from "./ui/Card";
import ImageUpload from "./ImageUpload";

export default function CreateListingForm({ marketplace, onSave, onCancel }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: "",
    category: marketplace.category || CATEGORIES[0].name,
    quantity: 1,
    price: "",
    note: "",
  });
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateListing(form, marketplace);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const badWord = checkProfanity(form.name, form.note);
    if (badWord) {
      alert("Please remove offensive language from your listing.");
      return;
    }

    setSubmitting(true);
    try {
      // Moderate content
      const modResult = await moderateContent({
        name: form.name,
        note: form.note,
        category: form.category,
      });
      if (modResult && !modResult.allowed) {
        alert(`Listing rejected: ${modResult.reason || "Content policy violation"}`);
        setSubmitting(false);
        return;
      }

      // Insert listing
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          name: form.name,
          category: form.category,
          quantity: Number(form.quantity) || 1,
          price: marketplace.pricing_mode === "free" ? 0 : Number(form.price),
          note: form.note || null,
          marketplace_id: marketplace.id,
          seller_id: profile.id,
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // Upload images
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img.file) continue;
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
            display_order: i,
          });
        }
      }

      onSave();
    } catch (err) {
      console.error("Failed to create listing:", err);
      alert("Failed to create listing: " + (err.message || "Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <h3 className="m-0 mb-4 text-[#002B5C] font-semibold text-lg">
        Create New Listing
      </h3>
      <form onSubmit={submit}>
        <Input
          label="Item Name"
          placeholder="e.g., TI-84 Calculator"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
        />
        {!marketplace.category && (
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>
        )}
        <Input
          label="Quantity"
          type="number"
          min="1"
          value={form.quantity}
          onChange={(e) => update("quantity", e.target.value)}
        />
        {marketplace.pricing_mode !== "free" && (
          <Input
            label={`Price ($)${marketplace.pricing_mode === "max" ? ` — Max: $${marketplace.price_max}` : ""}`}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            error={errors.price}
          />
        )}
        <div>
          <TextArea
            label="Note (optional)"
            placeholder="Any details about the item..."
            value={form.note}
            maxLength={100}
            onChange={(e) => update("note", e.target.value)}
          />
          <p className="text-xs text-gray-400 text-right mt-1 m-0">{form.note.length}/100</p>
        </div>
        {marketplace.allow_pictures && (
          <ImageUpload images={images} onChange={setImages} />
        )}
        <div className="flex gap-2 mt-2">
          <Button type="button" variant="secondary" full onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" full disabled={submitting}>
            {submitting ? "Posting..." : "Post Listing"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
