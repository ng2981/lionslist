import { useState, useEffect, useRef } from "react";
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
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfHtml, setPdfHtml] = useState("");
  const pdfRef = useRef(null);
  const [deletingId, setDeletingId] = useState(null);

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

  const generatePdf = async () => {
    const activeListings = myListings.filter((l) => !l.sold);
    if (activeListings.length === 0) {
      alert("You don't have any active listings to include in the PDF.");
      return;
    }

    setPdfLoading(true);
    setPdfReady(false);
    setPdfBlob(null);
    setPdfHtml("");

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-listing-pdf",
        {
          body: {
            sellerName: profile.full_name,
            school: profile.school,
            graduationYear: profile.graduation_year,
            listings: myListings.map((l) => ({
              name: l.name,
              price: l.price,
              note: l.note,
              category: l.category,
              marketplace: l.marketplaces?.name,
              sold: l.sold,
            })),
          },
        }
      );

      if (error) throw error;
      if (!data.html) throw new Error("No HTML returned");

      setPdfHtml(data.html);

      // Wait for the hidden HTML to render, then convert to PDF
      await new Promise((r) => setTimeout(r, 500));

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const blob = pdf.output("blob");
      setPdfBlob(blob);
      setPdfReady(true);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.full_name.replace(/\s+/g, "_")}_LionsList.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Check out my listings on LionsList! - ${profile.full_name}, ${profile.school} Class of ${profile.graduation_year}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const deleteListing = async (id) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
      setMyListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      alert("Failed to delete listing: " + err.message);
    } finally {
      setDeletingId(null);
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteListing(l.id);
                    }}
                    disabled={deletingId === l.id}
                    title="Delete listing"
                    className="ml-1 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 bg-transparent border-none cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create PDF */}
      <Card className="max-w-[600px] mx-auto mb-6">
        <h3 className="m-0 mb-2 text-[#002B5C] font-semibold">
          Share Your Listings
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Generate a beautifully designed PDF catalog of your listings to share on WhatsApp.
        </p>
        {!pdfReady ? (
          <Button
            onClick={generatePdf}
            disabled={pdfLoading || myListings.length === 0}
            full
            className="!py-3 !text-base"
          >
            {pdfLoading ? "Generating PDF..." : "Create PDF"}
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button onClick={downloadPdf} full className="!py-3 !text-base">
              Download PDF
            </Button>
            <Button
              variant="whatsapp"
              onClick={shareOnWhatsApp}
              full
              className="!py-3 !text-base"
            >
              Share on WhatsApp
            </Button>
          </div>
        )}
        {myListings.length === 0 && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Create some listings first to generate a PDF.
          </p>
        )}
      </Card>

      {/* Hidden PDF render container */}
      {pdfHtml && (
        <div
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "800px",
          }}
        >
          <div ref={pdfRef} dangerouslySetInnerHTML={{ __html: pdfHtml }} />
        </div>
      )}

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
