import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import ListingDetailModal from "../components/ListingDetailModal";

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [listings, setListings] = useState([]);
  const [sellers, setSellers] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);

  // Decode category name from slug
  const categoryName = decodeURIComponent(slug);
  const category = CATEGORIES.find((c) => c.name === categoryName);
  const isMoveOutSale = categoryName === "Move Out Sale";

  useEffect(() => {
    fetchListings();
  }, [categoryName]);

  async function fetchListings() {
    setLoading(true);

    let query;
    if (isMoveOutSale) {
      // Fetch listings that belong to an active move-out sale
      query = supabase
        .from("listings")
        .select("*, listing_images(*), move_out_sales(*)")
        .not("move_out_sale_id", "is", null)
        .eq("sold", false)
        .order("created_at", { ascending: false });
    } else {
      query = supabase
        .from("listings")
        .select("*, listing_images(*)")
        .eq("category", categoryName)
        .eq("sold", false)
        .order("created_at", { ascending: false });
    }

    const { data } = await query;
    setListings(data || []);

    // Fetch seller profiles
    const sellerIds = [...new Set((data || []).map((l) => l.seller_id))];
    if (sellerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, whatsapp")
        .in("id", sellerIds);
      const map = {};
      (profiles || []).forEach((p) => (map[p.id] = p));
      setSellers(map);
    }

    setLoading(false);
  }

  // Group move-out-sale listings by sale for slideshow display
  const moveOutSaleGroups = useMemo(() => {
    if (!isMoveOutSale) return null;
    const groups = {};
    for (const l of listings) {
      const saleId = l.move_out_sale_id;
      if (!groups[saleId]) {
        groups[saleId] = {
          sale: l.move_out_sales,
          items: [],
        };
      }
      groups[saleId].items.push(l);
    }
    return Object.values(groups);
  }, [listings, isMoveOutSale]);

  const requestItem = async (listing) => {
    if (listing.seller_id === profile?.id) {
      alert("This is your own listing!");
      return;
    }
    const { error } = await supabase.from("buy_requests").insert({
      listing_id: listing.id,
      buyer_id: profile.id,
    });
    if (error) {
      if (error.code === "23505") {
        alert("You've already requested this item.");
      } else {
        alert("Failed to request: " + error.message);
      }
    } else {
      alert("Request sent! The seller will be notified.");
    }
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none cursor-pointer font-semibold text-sm p-0 mb-4"
        style={{ color: 'var(--columbia-navy)' }}
      >
        &larr; Back to Home
      </button>

      <div className="mb-6">
        <h1 className="text-2xl m-0 flex items-center gap-2 display-text" style={{ color: 'var(--columbia-navy)' }}>
          {isMoveOutSale ? "📦" : category?.icon} {categoryName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {loading ? "Loading..." : `${listings.length} item${listings.length !== 1 ? "s" : ""} available`}
        </p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading...</p>
      ) : listings.length === 0 ? (
        <Card className="text-center !py-12 text-gray-400">
          <div className="text-5xl mb-3">{isMoveOutSale ? "📦" : category?.icon || "🛒"}</div>
          <p>No items in this category yet.</p>
          <Button onClick={() => navigate("/sell")} className="mt-4">
            Sell Something
          </Button>
        </Card>
      ) : isMoveOutSale && moveOutSaleGroups ? (
        // Move Out Sale — grouped by sale with slideshow
        <div className="space-y-6">
          {moveOutSaleGroups.map((group) => (
            <MoveOutSaleCard
              key={group.sale?.id || "unknown"}
              group={group}
              sellers={sellers}
              onRequest={requestItem}
              profile={profile}
            />
          ))}
        </div>
      ) : (
        // Regular category — grid of items
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => {
            const imgs = (l.listing_images || []).sort((a, b) => a.display_order - b.display_order);
            const firstImage = imgs[0]?.image_url;
            const seller = sellers[l.seller_id];
            const sellerName = seller?.full_name || "Unknown";
            const isFree = Number(l.price) === 0;
            return (
              <div
                key={l.id}
                className="listing-card"
                onClick={() => setSelectedListing(l)}
              >
                {firstImage ? (
                  <img src={firstImage} alt={l.name} className="card-thumb" />
                ) : (
                  <div className="card-thumb-placeholder">
                    {category?.icon || "📦"}
                  </div>
                )}
                <div className="card-body">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="card-title">{l.name}</h3>
                    <span className={`card-price ${isFree ? 'free' : ''}`}>
                      {isFree ? "FREE" : `$${Number(l.price).toFixed(0)}`}
                    </span>
                  </div>
                  {l.note && (
                    <p className="card-blurb">{l.note}</p>
                  )}
                  <div className="card-footer">
                    <div className="card-avatar">{sellerName[0].toUpperCase()}</div>
                    <span className="card-seller">{sellerName}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Listing Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          seller={sellers[selectedListing.seller_id]}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </div>
  );
}

// Slideshow card for a move-out sale group
function MoveOutSaleCard({ group, sellers, onRequest, profile }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const items = group.items;
  const seller = sellers[items[0]?.seller_id];
  const currentItem = items[currentIdx];
  const allImages = items.flatMap((item) =>
    (item.listing_images || [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((img) => ({ ...img, itemName: item.name, itemPrice: item.price, itemId: item.id }))
  );
  const [imgIdx, setImgIdx] = useState(0);

  const nextImg = () => setImgIdx((i) => (i + 1) % Math.max(allImages.length, 1));
  const prevImg = () => setImgIdx((i) => (i - 1 + Math.max(allImages.length, 1)) % Math.max(allImages.length, 1));

  return (
    <Card className="overflow-hidden">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="m-0 text-lg font-bold text-[#002B5C]">{group.sale?.title || "Move Out Sale"}</h3>
          <p className="text-xs text-gray-500 mt-1 m-0">
            by <strong>{seller?.full_name || "Unknown"}</strong> · {items.length} item{items.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Image slideshow */}
      {allImages.length > 0 && (
        <div className="relative mb-4 rounded-lg overflow-hidden">
          <img
            src={allImages[imgIdx].image_url}
            alt={allImages[imgIdx].itemName}
            className="w-full h-[240px] object-cover bg-gray-100"
          />
          {allImages.length > 1 && (
            <>
              <button
                onClick={prevImg}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 border-none cursor-pointer text-lg flex items-center justify-center hover:bg-white transition-colors"
              >
                &lsaquo;
              </button>
              <button
                onClick={nextImg}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 border-none cursor-pointer text-lg flex items-center justify-center hover:bg-white transition-colors"
              >
                &rsaquo;
              </button>
            </>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {allImages[imgIdx].itemName} — {Number(allImages[imgIdx].itemPrice) === 0 ? "FREE" : `$${Number(allImages[imgIdx].itemPrice).toFixed(0)}`}
          </div>
        </div>
      )}

      {/* Item list */}
      <div className="space-y-2">
        {items.map((item) => {
          const isOwn = item.seller_id === profile?.id;
          return (
            <div key={item.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
              <div>
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-xs text-gray-400 ml-2">{item.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-600">
                  {Number(item.price) === 0 ? "FREE" : `$${Number(item.price).toFixed(0)}`}
                </span>
                {!isOwn && (
                  <button
                    onClick={() => onRequest(item)}
                    className="text-xs font-semibold text-[#002B5C] bg-[#DCE9F5] px-2.5 py-1 rounded-md border-none cursor-pointer hover:bg-[#C5DBE9] transition-colors"
                  >
                    Request
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
