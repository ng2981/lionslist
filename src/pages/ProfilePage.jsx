import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { abbr } from "../utils/helpers";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { COUNTRY_CODES } from "../constants/countryCodes";

function parsePhone(whatsapp) {
  const raw = (whatsapp || "").replace(/[^0-9+]/g, "");
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (raw.startsWith(c.code)) {
      return { countryCode: c.code, phone: raw.slice(c.code.length) };
    }
  }
  return { countryCode: "+1", phone: raw };
}

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [myListings, setMyListings] = useState([]);
  const [myMarketplaces, setMyMarketplaces] = useState([]);
  const [boughtItems, setBoughtItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      const parsed = parsePhone(profile.whatsapp);
      setForm({
        full_name: profile.full_name || "",
        countryCode: parsed.countryCode,
        whatsapp: parsed.phone,
        graduation_year: profile.graduation_year || "",
      });
      fetchMyListings();
      fetchMyMarketplaces();
      fetchBoughtItems();
    }
  }, [profile]);

  async function fetchMyListings() {
    const { data } = await supabase
      .from("listings")
      .select("*, marketplaces(id, name, code)")
      .eq("seller_id", profile.id)
      .order("created_at", { ascending: false });
    setMyListings(data || []);
  }

  async function fetchBoughtItems() {
    const { data } = await supabase
      .from("listings")
      .select("*, marketplaces(id, name, code), profiles!listings_seller_id_fkey(full_name)")
      .eq("buyer_id", profile.id)
      .eq("sold", true)
      .order("created_at", { ascending: false });
    setBoughtItems(data || []);
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
          whatsapp: form.countryCode + form.whatsapp.replace(/\D/g, ""),
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
        className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        ← Back to Home
      </button>

      <Card className="max-w-[600px] mx-auto mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="m-0 text-[#002B5C] font-bold">My Profile</h2>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Number
              </label>
              <div className="flex gap-2">
                <select
                  value={form.countryCode}
                  onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value }))}
                  className="w-[180px] px-2 py-2.5 rounded-lg border border-gray-300 text-sm outline-none bg-white focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} {c.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="2345678900"
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm outline-none box-border focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
                />
              </div>
            </div>
            <Select
              label="Graduation Year"
              value={form.graduation_year}
              onChange={(e) =>
                setForm((f) => ({ ...f, graduation_year: e.target.value }))
              }
            >
              <option value="">Select year...</option>
              {Array.from({ length: 10 }, (_, i) => 2022 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
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
        <h3 className="m-0 mb-4 text-[#002B5C] font-semibold">
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
                  l.marketplaces && navigate(`/marketplace/${l.marketplaces.code || l.marketplaces.id}`)
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
        <h3 className="m-0 mb-4 text-[#002B5C] font-semibold">
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
                  onClick={() => navigate(`/marketplace/${m.code || m.id}`)}
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
      {/* Bought Items */}
      <Card className="max-w-[600px] mx-auto mt-6">
        <h3 className="m-0 mb-4 text-[#002B5C] font-semibold">
          Bought Items ({boughtItems.length})
        </h3>
        {boughtItems.length === 0 ? (
          <p className="text-gray-400 text-center py-6">
            No purchased items yet.
          </p>
        ) : (
          <div className="space-y-3">
            {boughtItems.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={() =>
                  l.marketplaces && navigate(`/marketplace/${l.marketplaces.code || l.marketplaces.id}`)
                }
              >
                <div>
                  <span className="font-medium text-sm">{l.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    from {l.profiles?.full_name || "Unknown"}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    in {l.marketplaces?.name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {l.sold_price != null ? (
                    <span className="text-green-600 font-semibold text-sm">
                      ${l.sold_price}
                    </span>
                  ) : l.price > 0 ? (
                    <span className="text-green-600 font-semibold text-sm">
                      ${l.price}
                    </span>
                  ) : null}
                  <Badge color="blue">Bought</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
