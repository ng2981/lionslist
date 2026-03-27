import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function VerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const verify = async () => {
    if (!code.trim()) {
      setError("Please enter the verification code");
      return;
    }
    setVerifying(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (verifyError) throw verifyError;

      // Create profile from stored form data (registration flow)
      const pending = JSON.parse(sessionStorage.getItem("pendingProfile") || "{}");
      if (pending.name && data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: pending.name,
          email: pending.email,
          school: pending.school,
          graduation_year: Number(pending.gradYear),
          whatsapp: pending.whatsapp,
        });
        if (profileError) console.error("Profile creation error:", profileError);
        sessionStorage.removeItem("pendingProfile");
      }

      navigate("/home");
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002B5C] to-[#9BCBEB] flex items-center justify-center p-4">
      <Card className="max-w-[400px] w-full text-center">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-[#002B5C] mb-2 font-bold">Verify Your Email</h2>
        <p className="text-gray-500 text-sm mb-6">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
        <Input
          placeholder="Enter 6-digit code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          error={error}
          className="!text-center !text-xl !tracking-[8px]"
        />
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" onClick={() => navigate("/")} full>
            Back
          </Button>
          <Button onClick={verify} full disabled={verifying}>
            {verifying ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
