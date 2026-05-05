import { useState, useEffect, useRef } from "react";
import { CATEGORIES } from "../constants/categories";
import { whatsappLink } from "../utils/helpers";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import Badge from "./ui/Badge";

export default function ListingDetailModal({ listing, seller, onClose }) {
  const { profile, refreshPending } = useAuth();
  const [activeImg, setActiveImg] = useState(0);
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
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
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl animate-[scaleIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Images */}
        {images.length > 0 ? (
          <div>
            <img
              src={images[activeImg]?.image_url}
              alt={listing.name}
              className="w-full h-[300px] object-contain bg-gray-100 rounded-t-2xl"
            />
            {images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img.image_url}
                    alt=""
                    onClick={() => setActiveImg(i)}
                    className={`w-14 h-14 rounded-lg object-cover cursor-pointer shrink-0 border-2 transition-all ${
                      i === activeImg ? "border-[#002B5C] opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-[200px] flex items-center justify-center text-6xl text-gray-300 bg-gray-100 rounded-t-2xl">
            {cat?.icon || "📦"}
          </div>
        )}

        {/* Details */}
        <div className="p-5">
          <div className="flex justify-between items-start">
            <h2 className="m-0 text-xl font-bold text-gray-900">{listing.name}</h2>
            <span className="font-bold text-green-600 text-xl shrink-0 ml-3">
              {Number(listing.price) === 0 ? "FREE" : `$${Number(listing.price).toFixed(2)}`}
            </span>
          </div>

          <div className="flex gap-2 mt-3 text-sm text-gray-500 flex-wrap">
            <span>{cat?.icon} {listing.category}</span>
            <span>·</span>
            <span>Qty: {listing.quantity}</span>
            <span>·</span>
            <span>{new Date(listing.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>

          {listing.note && (
            <p className="text-gray-600 text-sm mt-4 leading-relaxed whitespace-pre-wrap">{listing.note}</p>
          )}

          {/* Seller info */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#DCE9F5] flex items-center justify-center text-sm font-bold text-[#002B5C]">
                {(seller?.full_name || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="m-0 text-sm font-semibold text-gray-900">{seller?.full_name || "Unknown"}</p>
                <p className="m-0 text-xs text-gray-400">Seller</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex gap-2 flex-wrap">
            {!isMine && !listing.sold && !listing.sale_pending && (
              requested ? (
                <div className="flex items-center gap-2">
                  <Badge color="blue">Requested</Badge>
                  <span className="text-xs text-gray-400">You've already expressed interest</span>
                </div>
              ) : (
                <button
                  onClick={handleRequest}
                  disabled={requesting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold bg-[#25D366] text-white border-none rounded-xl hover:bg-[#1fb855] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" className="w-5 h-5" />
                  {requesting ? "Sending..." : "I'm Interested — Contact Seller"}
                </button>
              )
            )}
            {listing.sold && <Badge color="red">Sold</Badge>}
            {listing.sale_pending && <Badge color="yellow">Sale Pending</Badge>}
            {isMine && <span className="text-sm text-gray-400">This is your listing</span>}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white border-none cursor-pointer text-lg hover:bg-black/60 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
}
