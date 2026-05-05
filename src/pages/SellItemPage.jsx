import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import { checkProfanity } from "../utils/profanity";
import { moderateContent } from "../lib/moderation";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import TextArea from "../components/ui/TextArea";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import ImageUpload from "../components/ImageUpload";

export default function SellItemPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: "",
    category: CATEGORIES[0].name,
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
    const errs = {};
    if (!form.name.trim()) errs.name = "Item name is required";
    if (!form.price && form.price !== 0) errs.price = "Price is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const badWord = checkProfanity(form.name, form.note);
    if (badWord) {
      alert("Please remove offensive language from your listing.");
      return;
    }

    setSubmitting(true);
    try {
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

      // Insert listing (no marketplace_id)
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          name: form.name,
          category: form.category,
          quantity: Number(form.quantity) || 1,
          price: Number(form.price) || 0,
          note: form.note || null,
          marketplace_id: null,
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

      navigate("/home");
    } catch (err) {
      console.error("Failed to create listing:", err);
      alert("Failed to create listing: " + (err.message || "Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        &larr; Back to Home
      </button>
      <Card className="max-w-[600px] mx-auto">
        <h2 className="text-[#002B5C] m-0 mb-2 font-bold">Sell an Item</h2>
        <p className="text-sm text-gray-500 mt-0 mb-6">List a single item for sale to fellow Columbia students.</p>
        <form onSubmit={submit}>
          <Input
            label="Item Name"
            placeholder="e.g., TI-84 Calculator"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            error={errors.name}
          />

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

          <Input
            label="Quantity"
            type="number"
            min="1"
            value={form.quantity}
            onChange={(e) => update("quantity", e.target.value)}
          />
          <Input
            label="Price ($)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            error={errors.price}
          />
          <div>
            <TextArea
              label="Description (optional)"
              placeholder="Any details about the item..."
              value={form.note}
              maxLength={300}
              onChange={(e) => update("note", e.target.value)}
            />
            <p className="text-xs text-gray-400 text-right mt-1 m-0">{form.note.length}/300</p>
          </div>

          <ImageUpload images={images} onChange={setImages} />

          <div className="flex gap-2 mt-4">
            <Button type="button" variant="secondary" full onClick={() => navigate("/home")}>
              Cancel
            </Button>
            <Button type="submit" full disabled={submitting}>
              {submitting ? "Posting..." : "Post Item"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

