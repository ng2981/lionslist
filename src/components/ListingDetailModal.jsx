import { useState, useEffect, useRef } from "react";
import { CATEGORIES } from "../constants/categories";
import { whatsappLink } from "../utils/helpers";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import Badge from "./ui/Badge";
import EditListingModal from "./EditListingModal";

export default function ListingDetailModal({ listing, seller, onClose, onDelete, onUpdate }) {
  const { profile, refreshPending } = useAuth();
  const [activeImg, setActiveImg] = useState(0);
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const isMine = listing.seller_id === profile?.id;
  const cat = CATEGORIES.find((c) => c.name === listing.category);
  const images = (listing.listing_images || []).sort((a, b) => a.display_order - b.display_order);

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

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleRequest = async () => {
    if (!profile || isMine) return;
    setRequesting(true);

    // Open WhatsApp
    if (seller?.whatsapp) {
      const waUrl = whatsappLink(seller.whatsapp, listing.name, listing.category);
      window.open(waUrl, "_blank");
    }

    const { error } = await supabase.from("buy_requests").insert({
      listing_id: listing.id,
      buyer_id: profile.id,
      message: `Interested in "${listing.name}"`,
    });

    if (error && error.code !== "23505") {
      alert("Request failed: " + error.message);
    }
    setRequested(true);
    setRequesting(false);
    refreshPending();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-[scaleIn_0.2s_ease-out]"
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Images */}
        {images.length > 0 ? (
          <div>
            <img
              src={images[activeImg]?.image_url}
              alt={listing.name}
              className="w-full object-contain"
              style={{ height: '320px', background: 'var(--surface-2)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
            />
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto" style={{ background: 'var(--surface-2)' }}>
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img.image_url}
                    alt=""
                    onClick={() => setActiveImg(i)}
                    className="shrink-0 object-cover cursor-pointer transition-all"
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: 'var(--radius-sm)',
                      border: i === activeImg ? '2px solid var(--columbia-navy)' : '2px solid transparent',
                      opacity: i === activeImg ? 1 : 0.6,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="w-full flex items-center justify-center text-6xl"
            style={{ height: '220px', background: 'var(--surface-2)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', color: 'var(--border-strong)' }}
          >
            {cat?.icon || "📦"}
          </div>
        )}

        {/* Details */}
        <div className="p-5">
          {/* Price */}
          <div className="flex justify-between items-start">
            <h2 className="m-0 text-xl display-text" style={{ color: 'var(--text)' }}>{listing.name}</h2>
            <span className="display-text text-xl shrink-0 ml-3" style={{ color: Number(listing.price) === 0 ? '#16a34a' : 'var(--columbia-navy)' }}>
              {Number(listing.price) === 0 ? "FREE" : `$${Number(listing.price).toFixed(2)}`}
            </span>
          </div>

          {/* Chips */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="chip chip-school">{cat?.icon} {listing.category}</span>
            {listing.quantity > 1 && (
              <span className="chip chip-default">Qty: {listing.quantity}</span>
            )}
            <span className="chip chip-default">
              {new Date(listing.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* Specs grid */}
          <div className="detail-specs">
            <div className="detail-spec">
              <div className="spec-label">Category</div>
              <div className="spec-value">{listing.category}</div>
            </div>
            <div className="detail-spec">
              <div className="spec-label">Quantity</div>
              <div className="spec-value">{listing.quantity}</div>
            </div>
            <div className="detail-spec">
              <div className="spec-label">Listed</div>
              <div className="spec-value">{new Date(listing.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
            </div>
          </div>

          {/* Description */}
          {listing.note && (
            <div className="mt-5">
              <p className="eyebrow mb-2">Description</p>
              <p className="m-0 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{listing.note}</p>
            </div>
          )}

          {/* Seller card */}
          <div className="mt-5">
            <p className="eyebrow mb-2">Seller</p>
            <div className="seller-card">
              <div className="seller-avatar">
                {(seller?.full_name || "?")[0].toUpperCase()}
              </div>
              <div>
                <div className="seller-name">{seller?.full_name || "Unknown"}</div>
                <div className="seller-sub">Columbia University</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        {!isMine && !listing.sold && !listing.sale_pending && (
          <div className="action-bar">
            {requested ? (
              <div className="flex items-center gap-2 w-full">
                <Badge color="blue">Requested</Badge>
                <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>You've already expressed interest</span>
              </div>
            ) : (
              <button
                onClick={handleRequest}
                disabled={requesting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold border-none cursor-pointer transition-colors disabled:opacity-50"
                style={{ background: '#25D366', color: 'white', borderRadius: 'var(--radius)' }}
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" className="w-5 h-5" />
                {requesting ? "Sending..." : "I'm Interested — Contact Seller"}
              </button>
            )}
          </div>
        )}
        {listing.sold && (
          <div className="action-bar">
            <Badge color="red">Sold</Badge>
          </div>
        )}
        {listing.sale_pending && (
          <div className="action-bar">
            <Badge color="yellow">Sale Pending</Badge>
          </div>
        )}
        {isMine && (
          <div className="action-bar" style={{ justifyContent: 'space-between' }}>
            <span className="text-sm" style={{ color: 'var(--text-subtle)' }}>This is your listing</span>
            <div className="flex items-center gap-2">
              {!listing.sold && (
                <button
                  onClick={() => setShowEdit(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#002B5C] bg-[#DCE9F5] border border-[#9BCBEB] rounded-lg cursor-pointer hover:bg-[#C5DBE9] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
              )}
              <button
                onClick={async () => {
                  if (!window.confirm("Delete this listing? This cannot be undone.")) return;
                  setDeleting(true);
                  try {
                    const { error } = await supabase.from("listings").delete().eq("id", listing.id);
                    if (error) throw error;
                    if (onDelete) onDelete(listing.id);
                    onClose();
                  } catch (err) {
                    alert("Failed to delete listing: " + err.message);
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center border-none cursor-pointer text-lg transition-colors"
          style={{ borderRadius: 'var(--radius-pill)', background: 'rgba(0,0,0,0.4)', color: 'white' }}
        >
          ×
        </button>
      </div>

      {showEdit && (
        <EditListingModal
          listing={listing}
          onClose={() => setShowEdit(false)}
          onSave={() => {
            if (onUpdate) onUpdate();
            onClose();
          }}
        />
      )}
    </div>
  );
}
