import { useState } from "react";
import { CATEGORIES } from "../constants/categories";
import { whatsappLink } from "../utils/helpers";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import Badge from "./ui/Badge";
import Button from "./ui/Button";

export default function ListingCard({
  listing,
  marketplace,
  sellerProfile,
  onMarkSold,
  expired,
}) {
  const { profile } = useAuth();
  const isMine = listing.seller_id === profile?.id;
  const cat = CATEGORIES.find((c) => c.name === listing.category);
  const images = listing.listing_images || [];
  const firstImage = images.length > 0 ? images[0].image_url : null;
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const waLink = sellerProfile
    ? whatsappLink(sellerProfile.whatsapp, listing.name, marketplace.name)
    : "#";

  const handleRequest = async () => {
    if (!profile) return;
    setRequesting(true);
    try {
      const { error } = await supabase.from("buy_requests").insert({
        listing_id: listing.id,
        buyer_id: profile.id,
        message: `Interested in "${listing.name}"`,
      });
      if (error) {
        if (error.code === "23505") {
          alert("You've already requested this item.");
        } else {
          throw error;
        }
      } else {
        setRequested(true);
      }
    } catch (err) {
      alert("Failed to send request: " + err.message);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 transition-all hover:shadow-md">
      {firstImage ? (
        <img
          src={firstImage}
          alt={listing.name}
          className="w-full h-[180px] object-cover bg-gray-100"
        />
      ) : (
        <div className="w-full h-[180px] flex items-center justify-center text-5xl text-gray-300 bg-gray-100">
          📦
        </div>
      )}
      <div className="p-4">
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
        <div className="flex gap-2 mt-2 text-xs text-gray-500">
          <span>Qty: {listing.quantity}</span>
          <span>·</span>
          <span>
            {cat?.icon} {listing.category}
          </span>
        </div>
        {listing.note && (
          <p className="text-gray-500 text-[13px] mt-2 leading-relaxed">
            {listing.note}
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-[13px] text-gray-500">
            by <strong>{sellerProfile?.full_name || "Unknown"}</strong>
          </span>
          <div className="flex gap-1.5">
            {!isMine && !expired && !listing.sold && (
              <>
                {requested ? (
                  <Badge color="blue">Requested</Badge>
                ) : (
                  <Button
                    small
                    onClick={handleRequest}
                    disabled={requesting}
                  >
                    {requesting ? "Sending..." : "Request to Buy"}
                  </Button>
                )}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold bg-[#25D366] text-white rounded-lg no-underline hover:bg-[#1fb855] transition-colors"
                >
                  Message
                </a>
              </>
            )}
            {isMine && !listing.sold && !expired && onMarkSold && (
              <Button
                small
                variant="success"
                onClick={() => onMarkSold(listing.id)}
              >
                Mark as Sold
              </Button>
            )}
            {listing.sold && <Badge color="red">SOLD</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}
