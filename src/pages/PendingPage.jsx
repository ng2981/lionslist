import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import { whatsappLink } from "../utils/helpers";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function PendingPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("buying");
  const [buyRequests, setBuyRequests] = useState([]);
  const [sellRequests, setSellRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchRequests();
  }, [profile]);

  async function fetchRequests() {
    setLoading(true);

    // Requests I made (buying)
    const { data: myRequests } = await supabase
      .from("buy_requests")
      .select("*, listings(id, name, price, category, sold, marketplace_id, seller_id, marketplaces(id, name))")
      .eq("buyer_id", profile.id)
      .order("created_at", { ascending: false });

    // Fetch seller profiles for my requests
    if (myRequests?.length) {
      const sellerIds = [...new Set(myRequests.map((r) => r.listings?.seller_id).filter(Boolean))];
      const { data: sellerProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, whatsapp")
        .in("id", sellerIds);
      const sellerMap = {};
      (sellerProfiles || []).forEach((p) => (sellerMap[p.id] = p));
      setBuyRequests(
        (myRequests || []).map((r) => ({
          ...r,
          sellerProfile: sellerMap[r.listings?.seller_id],
        }))
      );
    } else {
      setBuyRequests([]);
    }

    // Requests on my listings (selling)
    const { data: myListings } = await supabase
      .from("listings")
      .select("id")
      .eq("seller_id", profile.id);

    if (myListings?.length) {
      const listingIds = myListings.map((l) => l.id);
      const { data: incomingRequests } = await supabase
        .from("buy_requests")
        .select("*, listings(id, name, price, category, sold, marketplace_id, marketplaces(id, name))")
        .in("listing_id", listingIds)
        .order("created_at", { ascending: false });

      // Fetch buyer profiles
      if (incomingRequests?.length) {
        const buyerIds = [...new Set(incomingRequests.map((r) => r.buyer_id))];
        const { data: buyerProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, whatsapp")
          .in("id", buyerIds);
        const buyerMap = {};
        (buyerProfiles || []).forEach((p) => (buyerMap[p.id] = p));
        setSellRequests(
          (incomingRequests || []).map((r) => ({
            ...r,
            buyerProfile: buyerMap[r.buyer_id],
          }))
        );
      } else {
        setSellRequests([]);
      }
    } else {
      setSellRequests([]);
    }

    setLoading(false);
  }

  const updateStatus = async (requestId, status) => {
    await supabase.from("buy_requests").update({ status }).eq("id", requestId);
    fetchRequests();
  };

  const cancelRequest = async (requestId) => {
    await supabase.from("buy_requests").delete().eq("id", requestId);
    fetchRequests();
  };

  const pendingBuy = buyRequests.filter((r) => r.status === "pending");
  const acceptedBuy = buyRequests.filter((r) => r.status === "accepted");
  const declinedBuy = buyRequests.filter((r) => r.status === "declined");

  const pendingSell = sellRequests.filter((r) => r.status === "pending");
  const respondedSell = sellRequests.filter((r) => r.status !== "pending");

  const tabs = [
    { k: "buying", l: "My Requests", n: buyRequests.length },
    { k: "selling", l: "Buyer Requests", n: sellRequests.length },
  ];

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none text-[#1D4F91] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        <span className="flex items-center gap-1">
          <ArrowLeft size={16} /> Back to Home
        </span>
      </button>

      <h1 className="text-2xl font-bold text-[#1D4F91] m-0 mb-4">Pending</h1>

      {/* Tabs */}
      <div className="flex border-b-2 border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-6 py-2.5 cursor-pointer font-semibold text-sm border-none bg-transparent transition-all border-b-[3px] ${
              tab === t.k
                ? "border-[#1D4F91] text-[#1D4F91]"
                : "border-transparent text-gray-500"
            }`}
          >
            {t.l} <Badge color={tab === t.k ? "blue" : "gray"}>{t.n}</Badge>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-[#1D4F91] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* My Requests (Buying) */}
          {tab === "buying" && (
            <div className="space-y-6">
              {buyRequests.length === 0 ? (
                <Card className="text-center !py-12 text-gray-400">
                  <div className="text-5xl mb-3">🛒</div>
                  <p>You haven't made any buy requests yet.</p>
                  <p className="text-sm">Browse marketplaces and request items you're interested in.</p>
                </Card>
              ) : (
                <>
                  {pendingBuy.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Pending ({pendingBuy.length})
                      </h3>
                      <div className="space-y-3">
                        {pendingBuy.map((r) => (
                          <RequestCard
                            key={r.id}
                            request={r}
                            type="buying"
                            onCancel={() => cancelRequest(r.id)}
                            onNavigate={navigate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {acceptedBuy.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-3">
                        Accepted ({acceptedBuy.length})
                      </h3>
                      <div className="space-y-3">
                        {acceptedBuy.map((r) => (
                          <RequestCard
                            key={r.id}
                            request={r}
                            type="buying"
                            onNavigate={navigate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {declinedBuy.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-3">
                        Declined ({declinedBuy.length})
                      </h3>
                      <div className="space-y-3">
                        {declinedBuy.map((r) => (
                          <RequestCard
                            key={r.id}
                            request={r}
                            type="buying"
                            onCancel={() => cancelRequest(r.id)}
                            onNavigate={navigate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Buyer Requests (Selling) */}
          {tab === "selling" && (
            <div className="space-y-6">
              {sellRequests.length === 0 ? (
                <Card className="text-center !py-12 text-gray-400">
                  <div className="text-5xl mb-3">📬</div>
                  <p>No buy requests on your listings yet.</p>
                  <p className="text-sm">When someone is interested in your items, their requests will appear here.</p>
                </Card>
              ) : (
                <>
                  {pendingSell.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-3">
                        Needs Response ({pendingSell.length})
                      </h3>
                      <div className="space-y-3">
                        {pendingSell.map((r) => (
                          <RequestCard
                            key={r.id}
                            request={r}
                            type="selling"
                            onAccept={() => updateStatus(r.id, "accepted")}
                            onDecline={() => updateStatus(r.id, "declined")}
                            onNavigate={navigate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {respondedSell.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Responded ({respondedSell.length})
                      </h3>
                      <div className="space-y-3">
                        {respondedSell.map((r) => (
                          <RequestCard
                            key={r.id}
                            request={r}
                            type="selling"
                            onNavigate={navigate}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RequestCard({ request, type, onAccept, onDecline, onCancel, onNavigate }) {
  const listing = request.listings;
  const marketplace = listing?.marketplaces;
  const cat = CATEGORIES.find((c) => c.name === listing?.category);
  const person = type === "buying" ? request.sellerProfile : request.buyerProfile;

  const statusColors = {
    pending: "gray",
    accepted: "green",
    declined: "red",
  };

  const waLink = person?.whatsapp && listing
    ? whatsappLink(person.whatsapp, listing.name, marketplace?.name || "")
    : null;

  return (
    <Card className="!p-4">
      <div className="flex justify-between items-start gap-3">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => marketplace?.id && onNavigate(`/marketplace/${marketplace.id}`)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{cat?.icon || "\uD83D\uDCE6"}</span>
            <h4 className="m-0 text-[15px] font-semibold text-gray-900 truncate">
              {listing?.name || "Unknown Listing"}
            </h4>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            in {marketplace?.name || "Unknown Marketplace"}
          </p>
          {request.message && (
            <p className="text-sm text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">
              "{request.message}"
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {listing?.price > 0 && (
            <span className="font-bold text-green-600">${listing.price}</span>
          )}
          <Badge color={statusColors[request.status]}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[13px] text-gray-500">
          {type === "buying" ? "Seller" : "Buyer"}:{" "}
          <strong>{person?.full_name || "Unknown"}</strong>
        </span>
        <div className="flex gap-1.5">
          {/* Buying: show WhatsApp if accepted, cancel if pending/declined */}
          {type === "buying" && request.status === "accepted" && waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold bg-[#25D366] text-white rounded-lg no-underline hover:bg-[#1fb855] transition-colors"
            >
              Message Seller
            </a>
          )}
          {type === "buying" && (request.status === "pending" || request.status === "declined") && onCancel && (
            <Button small variant="secondary" onClick={onCancel}>
              {request.status === "pending" ? "Cancel" : "Remove"}
            </Button>
          )}

          {/* Selling: accept/decline if pending, WhatsApp for accepted */}
          {type === "selling" && request.status === "pending" && (
            <>
              <Button small variant="success" onClick={onAccept}>
                Accept
              </Button>
              <Button small variant="danger" onClick={onDecline}>
                Decline
              </Button>
            </>
          )}
          {type === "selling" && request.status === "accepted" && waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold bg-[#25D366] text-white rounded-lg no-underline hover:bg-[#1fb855] transition-colors"
            >
              Message Buyer
            </a>
          )}
        </div>
      </div>

      <p className="text-[11px] text-gray-300 mt-2 m-0">
        {new Date(request.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </Card>
  );
}
