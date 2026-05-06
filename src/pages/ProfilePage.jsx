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
import { jsPDF } from "jspdf";
import EditListingModal from "../components/EditListingModal";

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
  const [deletingId, setDeletingId] = useState(null);
  const [editingListing, setEditingListing] = useState(null);

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
      .select("*, listing_images(*), marketplaces(id, name, code)")
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
    try {
      // Pre-load all listing images as base64
      const imageCache = {};
      const imagePromises = [];
      for (const l of myListings) {
        const imgs = (l.listing_images || []).sort((a, b) => a.display_order - b.display_order);
        const url = imgs[0]?.image_url;
        if (url) {
          imagePromises.push(
            fetch(url)
              .then((r) => r.blob())
              .then((blob) => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => { imageCache[l.id] = reader.result; resolve(); };
                reader.readAsDataURL(blob);
              }))
              .catch(() => {}) // skip failed images
          );
        }
      }
      await Promise.all(imagePromises);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      const footerH = 22;
      let y = margin;

      const addPage = () => { pdf.addPage(); y = margin; };
      const checkPage = (need) => { if (y + need > pageH - margin - footerH) addPage(); };

      // Helper: wrap text and return lines
      const wrapText = (text, maxWidth, fontSize) => {
        pdf.setFontSize(fontSize);
        return pdf.splitTextToSize(text, maxWidth);
      };

      // Header
      pdf.setFillColor(0, 43, 92);
      pdf.rect(0, 0, pageW, 46, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("LionsList", margin, 17);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text("Columbia University Student Marketplace", margin, 24);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text(profile.full_name, margin, 34);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      const info = `${profile.school || "Columbia University"}  ·  Class of ${profile.graduation_year || "—"}`;
      pdf.text(info, margin, 40);
      y = 54;

      // Listing count
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(10);
      pdf.text(`${activeListings.length} active listing${activeListings.length !== 1 ? "s" : ""}`, margin, y);
      y += 8;

      // Active Listings
      const imgSize = 28;
      const textX = margin + 4;

      for (const l of activeListings) {
        const hasImg = !!imageCache[l.id];
        const textStartX = hasImg ? margin + imgSize + 6 : textX;
        const textMaxW = hasImg ? contentW - imgSize - 10 : contentW - 8;

        // Calculate card height dynamically
        let cardH = 10; // top padding + name line
        cardH += 6; // category + price row
        if (l.note) {
          const noteLines = wrapText(l.note, textMaxW, 8);
          cardH += noteLines.length * 3.5 + 2;
        }
        cardH += 4; // bottom padding
        const minH = hasImg ? imgSize + 8 : cardH;
        cardH = Math.max(cardH, minH);

        checkPage(cardH + 4);

        // Card background
        pdf.setFillColor(248, 249, 250);
        pdf.setDrawColor(220, 220, 220);
        pdf.roundedRect(margin, y, contentW, cardH, 2, 2, "FD");

        // Image
        if (hasImg) {
          try {
            pdf.addImage(imageCache[l.id], margin + 4, y + 4, imgSize, imgSize);
          } catch { /* skip broken image */ }
        }

        // Name
        let textY = y + 8;
        pdf.setTextColor(0, 43, 92);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        const name = l.name.length > 45 ? l.name.slice(0, 42) + "..." : l.name;
        pdf.text(name, textStartX, textY);

        // Price (right-aligned)
        const priceText = Number(l.price) === 0 ? "FREE" : `$${Number(l.price).toFixed(2)}`;
        pdf.setTextColor(22, 163, 74);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(priceText, margin + contentW - 4, textY, { align: "right" });

        // Category
        textY += 6;
        pdf.setTextColor(120, 120, 120);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(l.category || "Uncategorized", textStartX, textY);

        // Description (wrapped)
        if (l.note) {
          textY += 4;
          pdf.setTextColor(100, 100, 100);
          pdf.setFontSize(8);
          const noteLines = wrapText(l.note, textMaxW, 8);
          const maxNoteLines = 3;
          const displayLines = noteLines.slice(0, maxNoteLines);
          if (noteLines.length > maxNoteLines) {
            displayLines[maxNoteLines - 1] = displayLines[maxNoteLines - 1].slice(0, -3) + "...";
          }
          displayLines.forEach((line) => {
            pdf.text(line, textStartX, textY);
            textY += 3.5;
          });
        }

        y += cardH + 4;
      }

      // Sold items section
      const soldListings = myListings.filter((l) => l.sold);
      if (soldListings.length > 0) {
        checkPage(20);
        y += 2;
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Sold (${soldListings.length})`, margin, y);
        y += 7;

        for (const l of soldListings) {
          checkPage(14);
          pdf.setFillColor(245, 245, 245);
          pdf.roundedRect(margin, y, contentW, 10, 2, 2, "F");
          pdf.setTextColor(170, 170, 170);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          const name = l.name.length > 50 ? l.name.slice(0, 47) + "..." : l.name;
          pdf.text(name, margin + 4, y + 7);
          pdf.setFont("helvetica", "bold");
          pdf.text("SOLD", margin + contentW - 4, y + 7, { align: "right" });
          y += 13;
        }
      }

      // Marketing footer on every page
      const totalPages = pdf.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        // Footer background
        pdf.setFillColor(0, 43, 92);
        pdf.rect(0, pageH - footerH, pageW, footerH, "F");
        // CTA text
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Looking for more? Browse many more items on LionsList!", pageW / 2, pageH - 14, { align: "center" });
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(155, 203, 235);
        pdf.text("https://www.lionslist.app/  —  The Columbia Student Marketplace", pageW / 2, pageH - 8, { align: "center" });
      }

      pdf.save(`${profile.full_name.replace(/\s+/g, "_")}_LionsList.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF: " + err.message);
    } finally {
      setPdfLoading(false);
    }
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
              <div className="flex gap-2 min-w-0">
                <select
                  value={form.countryCode}
                  onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value }))}
                  className="shrink-0 w-[100px] px-2 py-2.5 rounded-lg border border-gray-300 text-sm outline-none bg-white focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C] box-border"
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
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm outline-none box-border focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
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
                onClick={() => setEditingListing(l)}
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
        <div className="flex gap-3">
          <Button
            onClick={generatePdf}
            disabled={pdfLoading || myListings.length === 0}
            full
            className="!py-3 !text-base"
          >
            {pdfLoading ? "Generating..." : "Download PDF"}
          </Button>
          <Button
            variant="whatsapp"
            onClick={shareOnWhatsApp}
            disabled={myListings.length === 0}
            full
            className="!py-3 !text-base"
          >
            Share on WhatsApp
          </Button>
        </div>
        {myListings.length === 0 && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            Create some listings first to generate a PDF.
          </p>
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

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSave={() => { fetchMyListings(); setEditingListing(null); }}
        />
      )}
    </div>
  );
}
