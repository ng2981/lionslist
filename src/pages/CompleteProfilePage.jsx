import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { SCHOOLS } from "../constants/schools";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import { COUNTRY_CODES } from "../constants/countryCodes";

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { session, refreshProfile, signOut } = useAuth();
  const [form, setForm] = useState({
    name: "",
    gradYear: "",
    countryCode: "+1",
    whatsapp: "",
    school: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name?.trim()) errs.name = "Name is required";
    if (!form.school) errs.school = "Please select your school";
    if (!form.gradYear || form.gradYear < 2020 || form.gradYear > 2035)
      errs.gradYear = "Enter a valid year";
    const digitsOnly = (form.whatsapp || "").replace(/\D/g, "");
    if (!digitsOnly || digitsOnly.length !== 10)
      errs.whatsapp = "Enter valid phone number";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        full_name: form.name,
        email: session.user.email,
        school: form.school,
        graduation_year: Number(form.gradYear),
        whatsapp: form.countryCode + form.whatsapp.replace(/\D/g, ""),
      });
      if (error) {
        console.error("Profile upsert error:", error);
        throw error;
      }
      await refreshProfile();
      // Small delay to ensure profile is loaded before navigating
      setTimeout(() => navigate("/home"), 200);
    } catch (err) {
      setErrors({ name: err.message || "Failed to create profile" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002B5C] to-[#9BCBEB] flex items-center justify-center p-4">
      <Card className="max-w-[440px] w-full">
        <div className="text-center mb-6">
          <img src="/favicon-192.png" alt="" className="w-16 h-16 mx-auto mb-2" />
          <h1 className="text-[28px] font-bold text-[#002B5C] m-0">
            Complete Your Profile
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            We need a few details before you can continue.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            error={errors.name}
          />
          <Select
            label="School"
            value={form.school}
            onChange={(e) => update("school", e.target.value)}
            error={errors.school}
          >
            <option value="">Select your school...</option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            label="Graduation Year"
            value={form.gradYear}
            onChange={(e) => update("gradYear", e.target.value)}
            error={errors.gradYear}
          >
            <option value="">Select year...</option>
            {Array.from({ length: 10 }, (_, i) => 2022 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number
            </label>
            <div className="flex gap-2">
              <select
                value={form.countryCode}
                onChange={(e) => update("countryCode", e.target.value)}
                className={`w-[180px] px-2 py-2.5 rounded-lg border border-gray-300 text-sm outline-none bg-white focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]`}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} {c.label}</option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="2345678900"
                value={form.whatsapp}
                onChange={(e) => update("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 10))}
                className={`flex-1 px-3.5 py-2.5 rounded-lg border text-sm outline-none box-border
                  ${errors.whatsapp ? "border-red-500" : "border-gray-300"} focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]`}
              />
            </div>
            {errors.whatsapp && (
              <p className="text-red-500 text-xs mt-1">{errors.whatsapp}</p>
            )}
          </div>
          <Button type="submit" full className="!py-3 !text-base mt-2" disabled={submitting}>
            {submitting ? "Saving..." : "Complete Profile"}
          </Button>
          <p className="text-center text-xs text-gray-400 mt-4">
            Wrong account?{" "}
            <button
              type="button"
              onClick={signOut}
              className="text-[#002B5C] font-semibold bg-transparent border-none cursor-pointer underline"
            >
              Sign out
            </button>
          </p>
        </form>
      </Card>
    </div>
  );
}
