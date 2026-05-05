import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CATEGORIES } from "../constants/categories";
import Card from "../components/ui/Card";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";

export default function AdminCategoriesPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  async function fetchRequests() {
    setLoading(true);
    let query = supabase
      .from("category_requests")
      .select("*, profiles:requested_by(full_name, email)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  }

  const mapToCategory = async (requestId, categoryName) => {
    await supabase
      .from("category_requests")
      .update({ status: "mapped", mapped_to: categoryName })
      .eq("id", requestId);

    // Also update any listings that used this custom category
    const request = requests.find((r) => r.id === requestId);
    if (request) {
      await supabase
        .from("listings")
        .update({ category: categoryName, custom_category: null })
        .eq("custom_category", request.requested_name);
    }

    fetchRequests();
  };

  const rejectRequest = async (requestId) => {
    await supabase
      .from("category_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);
    fetchRequests();
  };

  const approveAsNew = async (requestId) => {
    await supabase
      .from("category_requests")
      .update({ status: "approved" })
      .eq("id", requestId);
    fetchRequests();
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        &larr; Back to Home
      </button>

      <h1 className="text-2xl font-bold text-[#002B5C] m-0 mb-2">Category Requests</h1>
      <p className="text-sm text-gray-500 mt-0 mb-6">Review and categorize custom category submissions from users.</p>

      <div className="flex gap-2 mb-6">
        {["pending", "mapped", "approved", "rejected", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border-none transition-all ${
              filter === f
                ? "bg-[#002B5C] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : requests.length === 0 ? (
        <Card className="text-center !py-12 text-gray-400">
          <p>No {filter === "all" ? "" : filter} category requests.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="!p-4">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <p className="m-0 text-base font-semibold text-gray-900">
                    "{req.requested_name}"
                  </p>
                  <p className="text-xs text-gray-400 mt-1 m-0">
                    Requested by {req.profiles?.full_name || "Unknown"} · {new Date(req.created_at).toLocaleDateString()}
                  </p>
                  {req.suggested_parent && (
                    <p className="text-xs text-blue-600 mt-1 m-0">
                      System suggests: <strong>{req.suggested_parent}</strong>
                    </p>
                  )}
                  {req.mapped_to && (
                    <p className="text-xs text-green-600 mt-1 m-0">
                      Mapped to: <strong>{req.mapped_to}</strong>
                    </p>
                  )}
                </div>

                {req.status === "pending" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      onChange={(e) => {
                        if (e.target.value) mapToCategory(req.id, e.target.value);
                      }}
                      defaultValue=""
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
                    >
                      <option value="">Map to category...</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => approveAsNew(req.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                    >
                      Approve as New
                    </button>
                    <button
                      onClick={() => rejectRequest(req.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {req.status !== "pending" && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    req.status === "mapped" ? "bg-blue-100 text-blue-700" :
                    req.status === "approved" ? "bg-green-100 text-green-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {req.status}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
