import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function MyListingsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [listings, setListings] = useState([]);
  const [requestCounts, setRequestCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchMyListings();
  }, [profile]);

  async function fetchMyListings() {
    const { data } = await supabase
      .from("listings")
      .select("*, listing_images(image_url, display_order)")
      .eq("seller_id", profile.id)
      .order("created_at", { ascending: false });

    setListings(data || []);

    // Fetch buy request counts per listing (for "under offer" section)
    if (data?.length) {
      const listingIds = data.filter((l) => !l.sold).map((l) => l.id);
      if (listingIds.length) {
        const { data: requests } = await supabase
          .from("buy_requests")
          .select("listing_id")
          .in("listing_id", listingIds)
          .eq("status", "pending");
        const counts = {};
        (requests || []).forEach((r) => {
          counts[r.listing_id] = (counts[r.listing_id] || 0) + 1;
        });
        setRequestCounts(counts);
      }
    }

    setLoading(false);
  }

  const active = listings.filter((l) => !l.sold && !l.sale_pending);
  const pending = listings.filter((l) => l.sale_pending && !l.sold);
  const sold = listings.filter((l) => l.sold);
  const underOffer = active.filter((l) => requestCounts[l.id] > 0);

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        &larr; Back to Home
      </button>

      <h1 className="text-2xl font-bold text-[#002B5C] m-0 mb-1">My Listings</h1>
      <p className="text-sm text-gray-500 mt-0 mb-6">{listings.length} total listing{listings.length !== 1 ? "s" : ""}</p>

      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : listings.length === 0 ? (
        <Card className="text-center !py-12 text-gray-400">
          <div className="text-5xl mb-3">📋</div>
          <p>You haven't listed anything yet.</p>
          <Button onClick={() => navigate("/sell")} className="mt-4">
            Sell an Item
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Under Offer */}
          {underOffer.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-[#002B5C] mb-3">Under Offer ({underOffer.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {underOffer.map((l) => (
                  <ListingItem key={l.id} listing={l} bidCount={requestCounts[l.id]} />
                ))}
              </div>
            </div>
          )}

          {/* Active */}
          {active.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-700 mb-3">Active ({active.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {active.map((l) => (
                  <ListingItem key={l.id} listing={l} />
                ))}
              </div>
            </div>
          )}

          {/* Pending Sale */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-amber-700 mb-3">Pending Sale ({pending.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pending.map((l) => (
                  <ListingItem key={l.id} listing={l} isPending />
                ))}
              </div>
            </div>
          )}

          {/* Sold */}
          {sold.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-400 mb-3">Sold ({sold.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sold.map((l) => (
                  <ListingItem key={l.id} listing={l} isSold />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ListingItem({ listing, isSold, isPending, bidCount }) {
  const catIcon = CATEGORIES.find((c) => c.name === listing.category)?.icon;
  const imgs = (listing.listing_images || []).sort((a, b) => a.display_order - b.display_order);
  const firstImage = imgs[0]?.image_url;

  return (
    <div className={`bg-white rounded-xl overflow-hidden border border-gray-200 transition-all ${isSold ? "opacity-50" : ""}`}>
      {firstImage ? (
        <img src={firstImage} alt={listing.name} className={`w-full h-[140px] object-cover bg-gray-100 ${isSold ? "grayscale" : ""}`} />
      ) : (
        <div className="w-full h-[140px] flex items-center justify-center text-3xl text-gray-300 bg-gray-100">
          {catIcon || "📦"}
        </div>
      )}
      <div className="p-3">
        <div className="flex justify-between items-start">
          <h3 className={`m-0 text-sm font-semibold truncate ${isSold ? "text-gray-400" : ""}`}>
            {isSold && <span className="text-gray-400">(SOLD) </span>}
            {isPending && <span className="text-amber-600">(PENDING) </span>}
            {listing.name}
          </h3>
          <span className={`font-bold text-sm shrink-0 ml-2 ${isSold ? "text-gray-400" : "text-green-600"}`}>
            {Number(listing.price) === 0 ? "FREE" : `$${Number(listing.price).toFixed(0)}`}
          </span>
        </div>
        <div className="flex gap-1.5 mt-1.5 text-xs text-gray-400">
          <span>{catIcon} {listing.category}</span>
          <span>·</span>
          <span>{new Date(listing.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          {bidCount > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-600 font-semibold">{bidCount} bid{bidCount !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
