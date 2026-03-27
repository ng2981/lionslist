import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { SCHOOLS } from "../constants/schools";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { session, refreshProfile, signOut } = useAuth();
  const [form, setForm] = useState({
    name: "",
    gradYear: "",
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
    if (!form.whatsapp?.trim()) errs.whatsapp = "WhatsApp number is required";
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
        whatsapp: form.whatsapp,
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
          <div className="text-[32px] mb-2">🦁</div>
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
          <Input
            label="Graduation Year"
            type="number"
            placeholder="2026"
            value={form.gradYear}
            onChange={(e) => update("gradYear", e.target.value)}
            error={errors.gradYear}
          />
          <Input
            label="WhatsApp Number (with country code)"
            placeholder="+1 (234) 567-8900"
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            error={errors.whatsapp}
          />
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
