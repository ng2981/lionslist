import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { validateRegistration } from "../utils/validators";
import { SCHOOLS } from "../constants/schools";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    gradYear: "",
    whatsapp: "",
    school: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail.endsWith("@columbia.edu")) {
      setLoginError("Must be a @columbia.edu email");
      return;
    }
    setLoginSubmitting(true);
    setLoginError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: loginEmail,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      navigate("/verify", { state: { email: loginEmail } });
    } catch (err) {
      setLoginError(err.message || "Failed to send login code. Do you have an account?");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = validateRegistration(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: form.email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;

      sessionStorage.setItem("pendingProfile", JSON.stringify(form));
      navigate("/verify", { state: { email: form.email } });
    } catch (err) {
      setErrors({ email: err.message || "Failed to send verification code" });
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
            LionsList
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            The Columbia Student Marketplace
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer bg-transparent ${
              mode === "login"
                ? "border-[#002B5C] text-[#002B5C]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer bg-transparent ${
              mode === "register"
                ? "border-[#002B5C] text-[#002B5C]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Create an Account
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <p className="text-sm text-gray-500 mb-4">
              Enter your Columbia email to receive a login code.
            </p>
            <Input
              label="Columbia Email"
              type="email"
              placeholder="jd1234@columbia.edu"
              value={loginEmail}
              onChange={(e) => {
                setLoginEmail(e.target.value);
                setLoginError("");
              }}
              error={loginError}
            />
            <Button type="submit" full className="!py-3 !text-base mt-2" disabled={loginSubmitting}>
              {loginSubmitting ? "Sending code..." : "Send Login Code"}
            </Button>
            <p className="text-center text-xs text-gray-400 mt-4">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-[#002B5C] font-semibold bg-transparent border-none cursor-pointer underline"
              >
                Create one
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              error={errors.name}
            />
            <Input
              label="Columbia Email"
              type="email"
              placeholder="jd1234@columbia.edu"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              error={errors.email}
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
              {submitting ? "Sending code..." : "Create Account"}
            </Button>
            <p className="text-center text-xs text-gray-400 mt-4">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-[#002B5C] font-semibold bg-transparent border-none cursor-pointer underline"
              >
                Log in
              </button>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
