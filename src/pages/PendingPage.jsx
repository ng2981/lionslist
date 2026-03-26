import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { CATEGORIES } from "../constants/categories";
import { whatsappLink } from "../utils/helpers";
import { useCallback } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function PendingPage() {
  const { profile, refreshPending } = useAuth();
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
    try {
    // Requests I made (buying)
    const { data: myRequests } = await supabase
      .from("buy_requests")
      .select("*, listings(id, name, price, category, sold, marketplace_id, seller_id, marketplaces(id, name, code))")
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
        .select("*, listings(id, name, price, category, sold, marketplace_id, marketplaces(id, name, code))")
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

    } catch (err) {
      console.error("Fetch requests error:", err);
    }
    setLoading(false);
  }

  const updateStatus = async (requestId, status) => {
    await supabase.from("buy_requests").update({ status }).eq("id", requestId);
    fetchRequests();
    refreshPending();
  };

  const cancelRequest = async (requestId) => {
    await supabase.from("buy_requests").delete().eq("id", requestId);
    fetchRequests();
    refreshPending();
  };

  const markListingSold = async (listingId, soldPrice, buyerId) => {
    const update = { sold: true };
    if (soldPrice !== undefined && soldPrice !== null) update.sold_price = Number(soldPrice);
    if (buyerId) update.buyer_id = buyerId;
    await supabase.from("listings").update(update).eq("id", listingId);
    fetchRequests();
    refreshPending();
  };

  const markPendingSale = async (requestId, listingId, iBought) => {
    const update = { sale_pending: true };
    if (iBought) update.buyer_id = profile.id;
    await supabase.from("listings").update(update).eq("id", listingId);
    await supabase.from("buy_requests").delete().eq("id", requestId);
    fetchRequests();
    refreshPending();
  };

  const pendingBuy = buyRequests.filter((r) => r.status === "pending");
  const acceptedBuy = buyRequests.filter((r) => r.status === "accepted");
  const declinedBuy = buyRequests.filter((r) => r.status === "declined");

  const activeSellRequests = sellRequests.filter((r) => !r.listings?.sold);

  const tabs = [
    { k: "buying", l: "My Active Requests", n: buyRequests.length },
    { k: "selling", l: "Buyer Requests", n: activeSellRequests.length },
  ];

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate("/home")}
        className="bg-transparent border-none text-[#002B5C] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        <span className="flex items-center gap-1">
          <ArrowLeft size={16} /> Back to Home
        </span>
      </button>

      <h1 className="text-2xl font-bold text-[#002B5C] m-0 mb-4">Pending</h1>

      {/* Tabs */}
      <div className="flex border-b-2 border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-6 py-2.5 cursor-pointer font-semibold text-sm border-none bg-transparent transition-all border-b-[3px] ${
              tab === t.k
                ? "border-[#002B5C] text-[#002B5C]"
                : "border-transparent text-gray-500"
            }`}
          >
            {t.l} <Badge color={tab === t.k ? "blue" : "gray"}>{t.n}</Badge>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-[#002B5C] rounded-full animate-spin" />
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
                            onMarkPending={(iBought) => markPendingSale(r.id, r.listing_id, iBought)}
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
                            onCancel={() => cancelRequest(r.id)}
                            onMarkPending={(iBought) => markPendingSale(r.id, r.listing_id, iBought)}
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
              {activeSellRequests.length === 0 ? (
                <Card className="text-center !py-12 text-gray-400">
                  <div className="text-5xl mb-3">📬</div>
                  <p>No buy requests on your listings yet.</p>
                  <p className="text-sm">When someone is interested in your items, their requests will appear here.</p>
                </Card>
              ) : (
                <>
                  <div className="space-y-3">
                    {activeSellRequests.map((r) => (
                      <RequestCard
                        key={r.id}
                        request={r}
                        type="selling"
                        onMarkSold={(price, buyerId) => markListingSold(r.listing_id, price, buyerId)}
                        onNavigate={navigate}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RequestCard({ request, type, onCancel, onMarkSold, onMarkPending, onNavigate }) {
  const [showUnrequest, setShowUnrequest] = useState(false);
  const [unrequestReason, setUnrequestReason] = useState("");
  const [unrequestOther, setUnrequestOther] = useState("");
  const [showSoldConfirm, setShowSoldConfirm] = useState(false);
  const [soldPrice, setSoldPrice] = useState("");
  const [showRemind, setShowRemind] = useState(false);
  const [toast, setToast] = useState(null);

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

  const sellerToByerLink = person?.whatsapp && listing && type === "selling"
    ? (() => {
        const clean = (person.whatsapp || "").replace(/[^0-9+]/g, "");
        if (!clean) return null;
        const text = encodeURIComponent(
          `Hi! It looks like you're interested in "${listing.name}" on LionsList (${marketplace?.name || ""}). I wanted to reach out to arrange the details. Let me know!`
        );
        return `https://api.whatsapp.com/send?phone=${clean}&text=${text}`;
      })()
    : null;

  const remindLink = person?.whatsapp && listing
    ? (() => {
        const clean = (person.whatsapp || "").replace(/[^0-9+]/g, "");
        if (!clean) return null;
        const text = encodeURIComponent(
          `Hi! Just a friendly reminder to mark "${listing.name}" as sold on LionsList (${marketplace?.name || ""}) if the transaction is complete. Thanks!`
        );
        return `https://api.whatsapp.com/send?phone=${clean}&text=${text}`;
      })()
    : null;

  return (
    <>
    {showSoldConfirm && (
      <div
        className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
        onClick={() => setShowSoldConfirm(false)}
      >
        <div
          className="bg-white rounded-2xl max-w-sm w-full shadow-xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-4">
            <CheckCircle size={40} className="text-emerald-500 mx-auto mb-2" />
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
              onClick={() => { onMarkSold(soldPrice || null, request.buyer_id); setShowSoldConfirm(false); }}
              className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 border-none rounded-lg cursor-pointer hover:bg-emerald-700 transition-colors"
            >
              Confirm Sale{soldPrice ? ` at $${Number(soldPrice).toFixed(2)}` : ""}
            </button>
            <button
              onClick={() => { onMarkSold(null, request.buyer_id); setShowSoldConfirm(false); }}
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
    )}
    {showRemind && (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowRemind(false)}>
        <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-900 m-0 mb-1">Report as Sold</h3>
          <p className="text-sm text-gray-500 mt-0 mb-4">
            Did you buy <strong>{listing?.name}</strong>?
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setShowRemind(false); if (onMarkPending) onMarkPending(true); setToast("This item will appear as pending until the seller confirms the transaction. We hope you enjoy your purchase!"); setTimeout(() => setToast(null), 4000); }}
              className="w-full py-2.5 text-sm font-semibold text-white bg-[#25D366] border-none rounded-lg cursor-pointer hover:bg-[#1fb855] transition-colors"
            >
              I bought this item
            </button>
            <button
              onClick={() => { setShowRemind(false); if (onMarkPending) onMarkPending(false); setToast("Thanks for letting us know!"); setTimeout(() => setToast(null), 3000); }}
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
    )}
    {toast && (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white px-6 py-3 rounded-xl shadow-xl text-sm font-medium" onClick={() => setToast(null)}>
        {toast}
      </div>
    )}
    {showUnrequest && (
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
              onClick={() => { onCancel(); setShowUnrequest(false); setUnrequestReason(""); setUnrequestOther(""); }}
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
    )}
    <Card className="!p-4">
      <div className="flex justify-between items-start gap-3">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => marketplace && onNavigate(`/marketplace/${marketplace.code || marketplace.id}`)}
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
          {type === "buying" && request.status === "accepted" && (
            <>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold bg-[#25D366] text-white rounded-lg no-underline hover:bg-[#1fb855] transition-colors"
                >
                  Message Seller
                </a>
              )}
              {onRemind && !listing?.sold && (
                <a
                  href={remindLink || undefined}
                  target={remindLink ? "_blank" : undefined}
                  rel={remindLink ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg no-underline hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Remind to Mark Sold
                </a>
              )}
            </>
          )}
          {type === "buying" && request.status === "pending" && (
            <button
              onClick={() => setShowRemind(true)}
              className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
            >
              Report as Sold
            </button>
          )}
          {type === "buying" && (request.status === "pending" || request.status === "declined") && onCancel && (
            <button
              onClick={() => request.status === "pending" ? setShowUnrequest(true) : onCancel()}
              className="inline-flex items-center px-3.5 py-1.5 text-[13px] font-semibold bg-[#DCE9F5] text-[#002B5C] border border-[#9BCBEB] rounded-lg cursor-pointer hover:bg-[#C5DBE9] transition-colors"
            >
              {request.status === "pending" ? "Cancel Request" : "Remove"}
            </button>
          )}

          {/* Selling: Mark as Sold + Message Buyer */}
          {type === "selling" && !listing?.sold && (
            <>
              {sellerToByerLink && (
                <a
                  href={sellerToByerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold bg-[#25D366] text-white rounded-lg no-underline hover:bg-[#1fb855] transition-colors"
                >
                  Message Buyer
                </a>
              )}
              {onMarkSold && (
                <button
                  onClick={() => { setSoldPrice(listing?.price || ""); setShowSoldConfirm(true); }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle size={14} /> Mark as Sold
                </button>
              )}
            </>
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
    </>
  );
}
