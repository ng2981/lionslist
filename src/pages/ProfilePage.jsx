import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { abbr } from "../utils/helpers";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [myListings, setMyListings] = useState([]);
  const [myMarketplaces, setMyMarketplaces] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        whatsapp: profile.whatsapp || "",
        graduation_year: profile.graduation_year || "",
      });
      fetchMyListings();
      fetchMyMarketplaces();
    }
  }, [profile]);

  async function fetchMyListings() {
    const { data } = await supabase
      .from("listings")
      .select("*, marketplaces(id, name)")
      .eq("seller_id", profile.id)
      .order("created_at", { ascending: false });
    setMyListings(data || []);
  }

  async function fetchMyMarketplaces() {
    const { data } = await supabase
      .from("marketplaces")
      .select("*, listings(count)")
      .eq("creator_id", profile.id)
      .order("created_at", { ascending: false });
    setMyMarketplaces(
      (data || []).map((m) => ({
        ...m,
        listing_count: m.listings?.[0]?.count ?? 0,
      }))
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          whatsapp: form.whatsapp,
          graduation_year: Number(form.graduation_year),
        })
        .eq("id", profile.id);
      if (error) throw error;
      await refreshProfile();
      setEditing(false);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none text-[#1D4F91] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        ← Back to Home
      </button>

      <Card className="max-w-[600px] mx-auto mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="m-0 text-[#1D4F91] font-bold">My Profile</h2>
          {!editing && (
            <Button small variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div>
            <Input
              label="Full Name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
            <Input
              label="WhatsApp Number"
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
            />
            <Input
              label="Graduation Year"
              type="number"
              value={form.graduation_year}
              onChange={(e) =>
                setForm((f) => ({ ...f, graduation_year: e.target.value }))
              }
            />
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-400 block">Name</span>
              <span className="font-medium">{profile.full_name}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Email</span>
              <span className="font-medium">{profile.email}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">School</span>
              <span className="font-medium">{profile.school}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">
                Graduation Year
              </span>
              <span className="font-medium">{profile.graduation_year}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">WhatsApp</span>
              <span className="font-medium">{profile.whatsapp}</span>
            </div>
          </div>
        )}
      </Card>

      {/* My Listings */}
      <Card className="max-w-[600px] mx-auto mb-6">
        <h3 className="m-0 mb-4 text-[#1D4F91] font-semibold">
          My Listings ({myListings.length})
        </h3>
        {myListings.length === 0 ? (
          <p className="text-gray-400 text-center py-6">
            You haven't created any listings yet.
          </p>
        ) : (
          <div className="space-y-3">
            {myListings.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={() =>
                  l.marketplaces?.id && navigate(`/marketplace/${l.marketplaces.id}`)
                }
              >
                <div>
                  <span className="font-medium text-sm">{l.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    in {l.marketplaces?.name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {l.price > 0 && (
                    <span className="text-green-600 font-semibold text-sm">
                      ${l.price}
                    </span>
                  )}
                  {l.sold ? (
                    <Badge color="red">SOLD</Badge>
                  ) : (
                    <Badge color="green">Active</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* My Marketplaces */}
      <Card className="max-w-[600px] mx-auto">
        <h3 className="m-0 mb-4 text-[#1D4F91] font-semibold">
          My Marketplaces ({myMarketplaces.length})
        </h3>
        {myMarketplaces.length === 0 ? (
          <p className="text-gray-400 text-center py-6">
            You haven't created any marketplaces yet.
          </p>
        ) : (
          <div className="space-y-3">
            {myMarketplaces.map((m) => {
              const expired = m.expiry_date && new Date(m.expiry_date) < new Date();
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/marketplace/${m.id}`)}
                >
                  <div>
                    <span className="font-medium text-sm">{m.name}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {m.listing_count} listing{m.listing_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.category && (
                      <span className="text-xs text-gray-400">{m.category}</span>
                    )}
                    {expired ? (
                      <Badge color="red">Archived</Badge>
                    ) : (
                      <Badge color="green">Active</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
