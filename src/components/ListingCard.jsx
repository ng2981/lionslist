import { useState, useRef, useEffect } from "react";
import { CATEGORIES } from "../constants/categories";
import { whatsappLink } from "../utils/helpers";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { MoreVertical, Pencil, Trash2, CheckCircle, RotateCcw } from "lucide-react";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import ImageUpload from "./ImageUpload";
import { checkProfanity } from "../utils/profanity";

export default function ListingCard({
  listing,
  marketplace,
  sellerProfile,
  onMarkSold,
  onReactivate,
  onUpdate,
  expired,
  autoExpand,
}) {
  const { profile, refreshPending } = useAuth();
  const isMine = listing.seller_id === profile?.id;
  const cat = CATEGORIES.find((c) => c.name === listing.category);
  const images = (listing.listing_images || []).sort((a, b) => a.display_order - b.display_order);
  const firstImage = images.length > 0 ? images[0].image_url : null;
  const [expanded, setExpanded] = useState(!!autoExpand);
  const [activeImg, setActiveImg] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [showRemind, setShowRemind] = useState(false);
  const [toast, setToast] = useState(null);
  const [showRequestMenu, setShowRequestMenu] = useState(false);
  const requestMenuRef = useRef(null);

  // Check if user already requested this listing
  useEffect(() => {
    if (!profile) return;
    supabase
      .from("buy_requests")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", profile.id)
      .then(({ data }) => {
        if (data?.length > 0) setRequested(true);
      });
  }, [listing.id, profile]);
  const [showUnrequest, setShowUnrequest] = useState(false);
  const [unrequestReason, setUnrequestReason] = useState("");
  const [unrequestOther, setUnrequestOther] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: listing.name,
    price: listing.price,
    quantity: listing.quantity,
    note: listing.note || "",
    category: listing.category,
  });
  const [editImages, setEditImages] = useState([]);

  useEffect(() => {
    if (!showMenu) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showMenu]);

  useEffect(() => {
    if (!showRequestMenu) return;
    const close = (e) => { if (requestMenuRef.current && !requestMenuRef.current.contains(e.target)) setShowRequestMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showRequestMenu]);

  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);

  const ownerMenu = isMine && !expired && (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setShowMenu((v) => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 border-none cursor-pointer transition-colors"
      >
        <MoreVertical size={16} className="text-gray-500" />
      </button>
      {showMenu && (
        <div className="absolute right-0 bottom-full mb-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 min-w-[160px]">
          {!listing.sold && (
            <>
              <button
                onClick={() => { setShowMenu(false); setActiveImg(0); setExpanded(true); startEditing(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors text-left"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => { setShowMenu(false); deleteListing(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 bg-transparent border-none cursor-pointer hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
          {listing.sold && onReactivate && (
            <button
              onClick={() => { setShowMenu(false); setShowReactivateConfirm(true); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-700 bg-transparent border-none cursor-pointer hover:bg-emerald-50 transition-colors text-left"
            >
              <RotateCcw size={14} /> Reactivate
            </button>
          )}
        </div>
      )}
    </div>
  );

  const reactivateConfirmModal = showReactivateConfirm && (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={() => setShowReactivateConfirm(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-5">
          <RotateCcw size={40} className="text-emerald-500 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-gray-900 m-0">Reactivate Listing</h3>
          <p className="text-sm text-gray-500 mt-2">
            This will mark <strong>{listing.name}</strong> as available for sale again.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { onReactivate(listing.id); setShowReactivateConfirm(false); }}
            className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 border-none rounded-lg cursor-pointer hover:bg-emerald-700 transition-colors"
          >
            Reactivate
          </button>
          <button
            onClick={() => setShowReactivateConfirm(false)}
            className="w-full py-2 text-sm text-gray-400 bg-transparent border-none cursor-pointer hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const [showSoldConfirm, setShowSoldConfirm] = useState(false);
  const [soldPrice, setSoldPrice] = useState("");

  const requestedMenu = requested && !isMine && !listing.sold && !listing.sale_pending && (
    <div className="relative" ref={requestMenuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setShowRequestMenu((v) => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 border-none cursor-pointer transition-colors"
      >
        <span className="text-gray-500 text-lg leading-none">⋮</span>
      </button>
      {showRequestMenu && (
        <div className="absolute right-0 bottom-full mb-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 min-w-[180px]">
          <button
            onClick={() => { setShowRequestMenu(false); setShowRemind(true); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 bg-transparent border-none cursor-pointer hover:bg-gray-50 transition-colors text-left"
          >
            Report as Sold
          </button>
          <button
            onClick={() => { setShowRequestMenu(false); setShowUnrequest(true); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 bg-transparent border-none cursor-pointer hover:bg-red-50 transition-colors text-left"
          >
            Cancel Request
          </button>
        </div>
      )}
    </div>
  );

  const markSoldButton = isMine && !listing.sold && !expired && onMarkSold && (
    <button
      onClick={(e) => { e.stopPropagation(); setSoldPrice(listing.price || ""); setShowSoldConfirm(true); }}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
    >
      <CheckCircle size={14} /> Mark as Sold
    </button>
  );

  const soldConfirmModal = showSoldConfirm && (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={() => setShowSoldConfirm(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">
            <CheckCircle size={40} className="text-emerald-500 mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 m-0">Confirm Sale</h3>
          <p className="text-sm text-gray-500 mt-1">What price did you sell this item for?</p>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Sale Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100"
              placeholder="0.00"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { onMarkSold(listing.id, soldPrice || null); setShowSoldConfirm(false); }}
            className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 border-none rounded-lg cursor-pointer hover:bg-emerald-700 transition-colors"
          >
            Confirm Sale{soldPrice ? ` at $${Number(soldPrice).toFixed(2)}` : ""}
          </button>
          <button
            onClick={() => { onMarkSold(listing.id, null); setShowSoldConfirm(false); }}
            className="w-full py-2.5 text-sm font-medium text-gray-500 bg-transparent border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          >
            Skip price & confirm sale
          </button>
          <button
            onClick={() => setShowSoldConfirm(false)}
            className="w-full py-2 text-sm text-gray-400 bg-transparent border-none cursor-pointer hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const startEditing = () => {
    setEditForm({
      name: listing.name,
      price: listing.price,
      quantity: listing.quantity,
      note: listing.note || "",
      category: listing.category,
    });
    // Load existing images into editable state
    setEditImages(
      images.map((img) => ({ url: img.image_url, preview: img.image_url, existing: true, id: img.id }))
    );
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) return;
    const badWord = checkProfanity(editForm.name, editForm.note);
    if (badWord) {
      alert("Please remove offensive language from your listing.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("listings")
        .update({
          name: editForm.name,
          price: Number(editForm.price) || 0,
          quantity: Number(editForm.quantity) || 1,
          note: editForm.note || null,
          category: editForm.category,
        })
        .eq("id", listing.id);
      if (error) throw error;

      // Delete removed existing images
      const keptIds = editImages.filter((img) => img.existing).map((img) => img.id);
      const removedImages = images.filter((img) => !keptIds.includes(img.id));
      for (const img of removedImages) {
        await supabase.from("listing_images").delete().eq("id", img.id);
      }

      // Update display_order for existing images (to reflect cover choice)
      const keptExisting = editImages.filter((img) => img.existing);
      for (let i = 0; i < keptExisting.length; i++) {
        await supabase.from("listing_images").update({ display_order: i }).eq("id", keptExisting[i].id);
      }

      // Upload new images
      const newImages = editImages.filter((img) => img.file);
      const startOrder = keptExisting.length;
      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];
        const path = `${profile.id}/${listing.id}/${Date.now()}_${i}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, img.file, { contentType: img.file.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("listing-images")
            .getPublicUrl(path);
          await supabase.from("listing_images").insert({
            listing_id: listing.id,
            image_url: urlData.publicUrl,
            display_order: startOrder + i,
          });
        }
      }

      if (onUpdate) onUpdate();
      setEditing(false);
    } catch (err) {
      alert("Failed to update listing: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async () => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
      if (error) throw error;
      if (onUpdate) onUpdate();
    } catch (err) {
      alert("Failed to delete listing: " + err.message);
    }
  };

  const waLink = sellerProfile
    ? whatsappLink(sellerProfile.whatsapp, listing.name, marketplace.name)
    : null;

  const handleRequest = () => {
    if (!profile) return;
    setRequesting(true);
    // Open WhatsApp immediately as user gesture
    if (waLink) window.open(waLink, "_blank");
    // Then insert the buy request
    supabase.from("buy_requests").insert({
      listing_id: listing.id,
      buyer_id: profile.id,
      message: `Interested in "${listing.name}"`,
    }).then(({ error }) => {
      if (error) {
        if (error.code !== "23505") {
          alert("Request failed: " + error.message);
        }
      }
      setRequested(true);
      setRequesting(false);
      refreshPending();
    });
    // Don't prevent default — let the <a> navigate to WhatsApp
  };

  const handleUnrequest = async () => {
    try {
      await supabase
        .from("buy_requests")
        .delete()
        .eq("listing_id", listing.id)
        .eq("buyer_id", profile.id);
      setRequested(false);
      setShowUnrequest(false);
      setUnrequestReason("");
      setUnrequestOther("");
      refreshPending();
    } catch {
      // silently handle
    }
  };

  const unrequestModal = showUnrequest && (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={() => setShowUnrequest(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 m-0 mb-1">Do you want to cancel this request?</h3>
        <p className="text-sm text-gray-500 mt-0 mb-1">Reason to cancel</p>
        <div className="mb-4 space-y-3">
          <select
            value={unrequestReason}
            onChange={(e) => { setUnrequestReason(e.target.value); if (e.target.value !== "Other") setUnrequestOther(""); }}
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Select a reason...</option>
            <option value="Seller is not responding">Seller is not responding</option>
            <option value="Changed my mind">Changed my mind</option>
            <option value="Bought another item">Bought another item</option>
            <option value="Requested by accident">Requested by accident</option>
            <option value="Other">Other</option>
          </select>
          {unrequestReason === "Other" && (
            <input
              type="text"
              placeholder="Please specify (optional)"
              value={unrequestOther}
              onChange={(e) => setUnrequestOther(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 outline-none focus:border-[#002B5C] focus:ring-2 focus:ring-blue-100"
            />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleUnrequest}
            disabled={!unrequestReason}
            className="w-full py-2.5 text-sm font-semibold text-white bg-red-500 border-none rounded-lg cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel Request
          </button>
          <button
            onClick={() => { setShowUnrequest(false); setUnrequestReason(""); setUnrequestOther(""); }}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#002B5C] border-none rounded-lg cursor-pointer hover:bg-[#001F42] transition-colors"
          >
            Keep Request
          </button>
        </div>
      </div>
    </div>
  );

  const handleRemindAction = async (iBought) => {
    setShowRemind(false);
    if (profile) {
      const update = { sale_pending: true };
      if (iBought) update.buyer_id = profile.id;
      const { error } = await supabase.from("listings").update(update).eq("id", listing.id);
      if (error) { console.error("Sale pending update error:", error); alert("Failed to update: " + error.message); return; }
      await supabase.from("buy_requests").delete().eq("listing_id", listing.id).eq("buyer_id", profile.id);
      setRequested(false);
      refreshPending();
      if (onUpdate) onUpdate();
    }
    setToast(iBought
      ? "This item will appear as pending until the seller confirms the transaction. We hope you enjoy your purchase!"
      : "Thanks for letting us know!");
    setTimeout(() => setToast(null), 4000);
  };

  const remindModal = showRemind && (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowRemind(false)}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 m-0 mb-1">Report as Sold</h3>
        <p className="text-sm text-gray-500 mt-0 mb-4">
          Did you buy <strong>{listing.name}</strong>?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleRemindAction(true)}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#25D366] border-none rounded-lg cursor-pointer hover:bg-[#1fb855] transition-colors"
          >
            I bought this item
          </button>
          <button
            onClick={() => handleRemindAction(false)}
            className="w-full py-2.5 text-sm font-semibold text-[#002B5C] bg-[#DCE9F5] border-none rounded-lg cursor-pointer hover:bg-[#C5DBE9] transition-colors"
          >
            Someone else bought it
          </button>
          <button onClick={() => setShowRemind(false)} className="w-full py-2 text-sm text-gray-400 bg-transparent border-none cursor-pointer hover:text-gray-600 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const toastEl = toast && (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white px-6 py-3 rounded-xl shadow-xl text-sm font-medium" onClick={() => setToast(null)}>
      {toast}
    </div>
  );

  const compact = !marketplace.allow_pictures && !firstImage;

  const expandedModal = expanded && (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => setExpanded(false)}
    >
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {images.length > 0 ? (
          <div>
            <img
              src={images[activeImg]?.image_url}
              alt={listing.name}
              className="w-full h-[320px] object-contain bg-gray-100 rounded-t-2xl"
            />
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.map((img, i) => (
                  <img
                    key={img.id || i}
                    src={img.image_url}
                    alt=""
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 rounded-lg object-cover cursor-pointer shrink-0 border-2 transition-all ${i === activeImg ? "border-[#002B5C] opacity-100" : "border-transparent opacity-60 hover:opacity-100"}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-[200px] flex items-center justify-center text-6xl text-gray-300 bg-gray-100 rounded-t-2xl">
            {cat?.icon || "\uD83D\uDCE6"}
          </div>
        )}
        <div className="p-5">
          {editing ? (
            <EditForm
              form={editForm}
              setForm={setEditForm}
              marketplace={marketplace}
              images={editImages}
              onImagesChange={setEditImages}
              saving={saving}
              onSave={async () => { await saveEdit(); setExpanded(false); }}
              onCancel={() => { setEditing(false); setExpanded(false); }}
              onDelete={deleteListing}
            />
          ) : (
            <>
              <div className="flex justify-between items-start">
                <h2 className="m-0 text-xl font-bold">{listing.name}</h2>
                {marketplace.pricing_mode !== "free" && listing.price != null ? (
                  <span className="font-bold text-green-600 text-xl">${listing.price}</span>
                ) : (
                  marketplace.pricing_mode === "free" && <Badge color="green">FREE</Badge>
                )}
              </div>
              <div className="flex gap-2 mt-3 text-sm text-gray-500 flex-wrap">
                <span>Qty: {listing.quantity}</span>
                <span>·</span>
                <span>{cat?.icon} {listing.category}</span>
                <span>·</span>
                <span>{new Date(listing.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              {listing.note && (
                <p className="text-gray-600 text-sm mt-3 leading-relaxed">{listing.note}</p>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  by <strong>{sellerProfile?.full_name || "Unknown"}</strong>
                </span>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap items-center">
                {!isMine && !expired && !listing.sold && !listing.sale_pending && (
                  requested ? (
                    <><Badge color="blue">Requested</Badge>{requestedMenu}</>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRequest(); }}
                      disabled={requesting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#25D366] text-white border-none rounded-lg hover:bg-[#1fb855] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" className="w-4 h-4" />
                      {requesting ? "Sending..." : "Request to Buy"}
                    </button>
                  )
                )}
                {markSoldButton}
                {isMine && !listing.sold && !expired && (
                  <button
                    onClick={deleteListing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-500 border-none rounded-lg cursor-pointer hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={14} /> Delete Listing
                  </button>
                )}
                {listing.sold && (listing.buyer_id === profile?.id ? <Badge color="green">Bought</Badge> : <Badge color="red">Sold</Badge>)}
              </div>
            </>
          )}
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={() => setExpanded(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white border-none cursor-pointer text-lg hover:bg-black/60 transition-colors"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <>
      {expandedModal}
      {soldConfirmModal}
      {reactivateConfirmModal}
      {unrequestModal}
      {remindModal}
      {toastEl}
      <div className="bg-white rounded-xl border border-gray-200 transition-all hover:shadow-md p-4 cursor-pointer" onClick={() => { setActiveImg(0); setExpanded(true); }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xl shrink-0">{cat?.icon || "\uD83D\uDCE6"}</span>
            <div className="min-w-0">
              <h3 className="m-0 text-sm font-semibold truncate">{listing.name}</h3>
              <div className="flex gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                <span>Qty: {listing.quantity}</span>
                <span>·</span>
                <span>by {sellerProfile?.full_name || "Unknown"}</span>
                <span>·</span>
                <span>{new Date(listing.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {marketplace.pricing_mode !== "free" && listing.price != null ? (
              <span className="font-bold text-green-600">${listing.price}</span>
            ) : (
              marketplace.pricing_mode === "free" && <Badge color="green">FREE</Badge>
            )}
            {!isMine && !expired && !listing.sold && !listing.sale_pending && (
              requested ? (
                <><Badge color="blue">Requested</Badge>{requestedMenu}</>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRequest(); }}
                  disabled={requesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-[#25D366] text-white border-none rounded-lg hover:bg-[#1fb855] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" className="w-3.5 h-3.5" />
                  {requesting ? "..." : "Request"}
                </button>
              )
            )}
            {markSoldButton}
            {ownerMenu}
            {listing.sold && (listing.buyer_id === profile?.id ? <Badge color="green">Bought</Badge> : <Badge color="red">Sold</Badge>)}
          </div>
        </div>
        {listing.note && (
          <p className="text-gray-500 text-[12px] mt-2 ml-9 leading-relaxed m-0">
            {listing.note}
          </p>
        )}
      </div>
      </>
    );
  }

  return (
    <>
    {expandedModal}
    {soldConfirmModal}
    {reactivateConfirmModal}
    {unrequestModal}
    {remindModal}
    {toastEl}
    <div className="bg-white rounded-xl border border-gray-200 transition-all hover:shadow-md cursor-pointer flex flex-col" onClick={() => { setActiveImg(0); setExpanded(true); }}>
      {firstImage ? (
        <img
          src={firstImage}
          alt={listing.name}
          className="w-full h-[180px] object-cover bg-gray-100 rounded-t-xl"
        />
      ) : (
        <div className="w-full h-[180px] flex items-center justify-center text-5xl text-gray-300 bg-gray-100 rounded-t-xl">
          📦
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start">
          <h3 className="m-0 text-base font-semibold">{listing.name}</h3>
          {marketplace.pricing_mode !== "free" && listing.price != null ? (
            <span className="font-bold text-green-600 text-lg">
              ${listing.price}
            </span>
          ) : (
            marketplace.pricing_mode === "free" && (
              <Badge color="green">FREE</Badge>
            )
          )}
        </div>
        <div className="flex gap-2 mt-2 text-xs text-gray-500 flex-wrap">
          <span>Qty: {listing.quantity}</span>
          <span>·</span>
          <span>
            {cat?.icon} {listing.category}
          </span>
          <span>·</span>
          <span>{new Date(listing.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
        {listing.note && (
          <p className="text-gray-500 text-[13px] mt-2 leading-relaxed">
            {listing.note}
          </p>
        )}
        <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-[13px] text-gray-500">
            by <strong>{sellerProfile?.full_name || "Unknown"}</strong>
          </span>
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {!isMine && !expired && !listing.sold && !listing.sale_pending && (
              requested ? (
                <><Badge color="blue">Requested</Badge>{requestedMenu}</>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRequest(); }}
                  disabled={requesting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold bg-[#25D366] text-white border-none rounded-lg hover:bg-[#1fb855] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" className="w-4 h-4" />
                  {requesting ? "Sending..." : "Request to Buy"}
                </button>
              )
            )}
            {markSoldButton}
            {ownerMenu}
            {listing.sold && (listing.buyer_id === profile?.id ? <Badge color="green">Bought</Badge> : <Badge color="red">Sold</Badge>)}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function EditForm({ form, setForm, marketplace, images, onImagesChange, saving, onSave, onCancel, onDelete }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      <input
        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
        placeholder="Listing name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <div className="flex gap-2">
        {marketplace.pricing_mode !== "free" && (
          <input
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
            type="number"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        )}
        <input
          className="w-20 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
          type="number"
          placeholder="Qty"
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
        />
        <select
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        >
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <input
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]"
          placeholder="Note (optional)"
          maxLength={100}
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        />
        <p className="text-xs text-gray-400 text-right mt-1 m-0">{form.note.length}/100</p>
      </div>
      {marketplace.allow_pictures && (
        <ImageUpload images={images} onChange={onImagesChange} />
      )}
      <div className="flex gap-2 items-center">
        <Button small variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button small onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-red-600 bg-transparent border-none cursor-pointer hover:text-red-800 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
