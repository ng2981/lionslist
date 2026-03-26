import { useNavigate } from "react-router-dom";
import { CATEGORIES } from "../constants/categories";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import { abbr } from "../utils/helpers";

export default function MarketplaceCard({ marketplace }) {
  const navigate = useNavigate();
  const m = marketplace;
  const expired = m.expiry_date && new Date(m.expiry_date) < new Date();
  const catIcon = CATEGORIES.find((c) => c.name === m.category)?.icon;

  return (
    <Card
      hover
      onClick={() => navigate(`/marketplace/${m.code || m.id}`)}
      className="!p-4"
    >
      <div className="flex justify-between items-start">
        <h3 className="m-0 text-base font-semibold text-[#002B5C]">{m.name}</h3>
        <div className="flex items-center gap-2">
          {catIcon && <span className="text-2xl">{catIcon}</span>}
          {expired ? (
            <Badge color="red">Archived</Badge>
          ) : (
            <Badge color="green">Active</Badge>
          )}
        </div>
      </div>
      <p className="text-gray-500 text-[13px] my-2 leading-relaxed">
        {m.description?.length > 80
          ? m.description.slice(0, 80) + "..."
          : m.description}
      </p>
      <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
        <span>
          {m.pricing_mode === "free"
            ? "Free items only"
            : m.pricing_mode === "max"
              ? `Max $${m.price_max}`
              : "Any price"}
        </span>
        <span>·</span>
        <span>{m.listing_count ?? 0} listings</span>
        {m.expiry_date && (
          <>
            <span>·</span>
            <span>
              Expires {new Date(m.expiry_date).toLocaleDateString()}
            </span>
          </>
        )}
      </div>
      {m.school_restrictions?.length > 0 && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {m.school_restrictions.map((s) => (
            <Badge key={s}>{abbr(s)}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
