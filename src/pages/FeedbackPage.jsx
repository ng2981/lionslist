import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import Card from "../components/ui/Card";
import TextArea from "../components/ui/TextArea";
import Button from "../components/ui/Button";

export default function FeedbackPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      alert("Please write your feedback before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: profile.id,
        message: message.trim(),
      });
      if (error) throw error;
      setSubmitted(true);
      setMessage("");
    } catch (err) {
      alert("Failed to submit feedback: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        <span className="flex items-center gap-1">
          <ArrowLeft size={16} /> Back
        </span>
      </button>

      <Card className="max-w-[600px] mx-auto">
        <h2 className="text-[#002B5C] m-0 mb-2 font-bold">Share Feedback</h2>
        <p className="text-sm text-gray-500 mt-0 mb-6">
          Help us improve LionsList. Tell us what you like, what's broken, or what you'd love to see.
        </p>

        {submitted ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎉</div>
            <p className="font-semibold text-gray-900">Thank you for your feedback!</p>
            <p className="text-sm text-gray-500 mt-1">We appreciate you helping us improve LionsList.</p>
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="secondary" onClick={() => setSubmitted(false)}>
                Send More
              </Button>
              <Button onClick={() => navigate("/home")}>
                Back to Home
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextArea
              label="Your Feedback"
              placeholder="What's on your mind? Bugs, feature requests, or general thoughts..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
            <Button type="submit" full className="!py-3 !text-base" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
