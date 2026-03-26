import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { SCHOOLS } from "../constants/schools";
import { CATEGORIES } from "../constants/categories";
import { abbr, slugify } from "../utils/helpers";
import { checkProfanity } from "../utils/profanity";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import TextArea from "../components/ui/TextArea";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Toggle from "../components/ui/Toggle";

export default function CreateMarketplacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: "",
    category: searchParams.get("category") || "",
    description: "",
    pricingMode: "any",
    priceMax: "",
    allowPictures: false,
    expiryDate: "",
    schoolRestrictions: [],
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleSchool = (s) =>
    setForm((f) => ({
      ...f,
      schoolRestrictions: f.schoolRestrictions.includes(s)
        ? f.schoolRestrictions.filter((x) => x !== s)
        : [...f.schoolRestrictions, s],
    }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) {
      alert("Please fill in the name and description.");
      return;
    }
    const badWord = checkProfanity(form.name, form.description);
    if (badWord) {
      alert("Please remove offensive language from your marketplace name or description.");
      return;
    }
    if (form.pricingMode === "max" && (!form.priceMax || Number(form.priceMax) <= 0)) {
      alert("Please enter a valid price maximum.");
      return;
    }
    if (form.expiryDate && profile?.graduation_year) {
      const expiryYear = new Date(form.expiryDate).getFullYear();
      if (expiryYear > profile.graduation_year) {
        alert(`Marketplaces cannot expire beyond your graduation year. Please select a date on or before December 31, ${profile.graduation_year}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Generate a unique code from the name
      const base = slugify(form.name);
      let code;
      try {
        const { count } = await supabase
          .from("marketplaces")
          .select("id", { count: "exact", head: true })
          .ilike("code", `${base}-%`);
        code = `${base}-${(count || 0) + 1}`;
      } catch {
        code = `${base}-1`;
      }

      const row = {
        name: form.name,
        ...(form.category ? { category: form.category } : {}),
        description: form.description,
        pricing_mode: form.pricingMode,
        price_max: form.pricingMode === "max" ? Number(form.priceMax) : null,
        allow_pictures: form.allowPictures,
        expiry_date: form.expiryDate || null,
        school_restrictions: form.schoolRestrictions,
        creator_id: profile.id,
      };

      // Try with code first, fall back without if column doesn't exist
      let { data, error } = await supabase
        .from("marketplaces")
        .insert({ ...row, code })
        .select()
        .single();

      if (error && (error.message?.includes("code") || error.code === "PGRST204")) {
        ({ data, error } = await supabase
          .from("marketplaces")
          .insert(row)
          .select()
          .single());
      }

      if (error) throw error;
      navigate(`/marketplace/${data.code || data.id}`);
    } catch (err) {
      console.error("Failed to create marketplace:", err);
      alert("Failed to create marketplace. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pricingOptions = [
    { v: "free", l: "Free Only" },
    { v: "any", l: "Any Price" },
    { v: "max", l: "Price Maximum" },
  ];

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        ← Back to Home
      </button>
      <Card className="max-w-[600px] mx-auto">
        <h2 className="text-[#002B5C] m-0 mb-6 font-bold">
          Create a Marketplace
        </h2>
        <form onSubmit={submit}>
          <Input
            label="Marketplace Name"
            placeholder="e.g., CBS Spring 2026 Graduation Tickets"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
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
            placeholder="What is this marketplace for?"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />

          <Field label="Pricing Mode">
            <div className="flex gap-2 flex-wrap">
              {pricingOptions.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => update("pricingMode", o.v)}
                  className={`px-4 py-2 rounded-lg border-2 cursor-pointer font-semibold text-[13px] transition-all ${
                    form.pricingMode === o.v
                      ? "border-[#002B5C] bg-[#DCE9F5] text-[#002B5C]"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </Field>

          {form.pricingMode === "max" && (
            <Input
              label="Maximum Price ($)"
              type="number"
              placeholder="50"
              value={form.priceMax}
              onChange={(e) => update("priceMax", e.target.value)}
            />
          )}

          <Toggle
            label="Allow Pictures on Listings"
            checked={form.allowPictures}
            onChange={(v) => update("allowPictures", v)}
          />

          <Input
            label="Expiry Date"
            type="date"
            value={form.expiryDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => update("expiryDate", e.target.value)}
          />

          <Field label="Restrict to Specific Schools (optional)">
            <p className="text-gray-400 text-xs m-0 mb-2">
              Leave unselected to allow all Columbia students
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SCHOOLS.map((s) => {
                const sel = form.schoolRestrictions.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSchool(s)}
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

          <Button type="submit" full className="!py-3 !text-base" disabled={submitting}>
            {submitting ? "Creating..." : "Launch Marketplace 🚀"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
