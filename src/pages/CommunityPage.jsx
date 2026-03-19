import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { SCHOOLS } from "../constants/schools";
import { abbr } from "../utils/helpers";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

export default function CommunityPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState({});
  const [marketplaces, setMarketplaces] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Fetch all profiles (no email or whatsapp)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, school, graduation_year")
      .order("full_name");

    setUsers(profiles || []);

    // Fetch listing counts per seller
    const { data: listingsData } = await supabase
      .from("listings")
      .select("seller_id, sold");

    const listingMap = {};
    (listingsData || []).forEach((l) => {
      if (!listingMap[l.seller_id]) listingMap[l.seller_id] = { active: 0, sold: 0 };
      if (l.sold) listingMap[l.seller_id].sold++;
      else listingMap[l.seller_id].active++;
    });
    setListings(listingMap);

    // Fetch marketplace counts per creator
    const { data: mktData } = await supabase
      .from("marketplaces")
      .select("creator_id");

    const mktMap = {};
    (mktData || []).forEach((m) => {
      mktMap[m.creator_id] = (mktMap[m.creator_id] || 0) + 1;
    });
    setMarketplaces(mktMap);

    setLoading(false);
  }

  // Collect unique graduation years for filter
  const years = useMemo(() => {
    const set = new Set(users.map((u) => u.graduation_year).filter(Boolean));
    return [...set].sort((a, b) => a - b);
  }, [users]);

  const filtered = useMemo(() => {
    let list = users;

    if (schoolFilter) {
      list = list.filter((u) => u.school === schoolFilter);
    }
    if (yearFilter) {
      list = list.filter((u) => u.graduation_year === Number(yearFilter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((u) =>
        u.full_name.toLowerCase().includes(q) ||
        (u.school || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, search, schoolFilter, yearFilter]);

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="bg-transparent border-none text-[#1D4F91] cursor-pointer font-semibold text-sm p-0 mb-4"
      >
        <span className="flex items-center gap-1">
          <ArrowLeft size={16} /> Back
        </span>
      </button>

      <h1 className="text-2xl font-bold text-[#1D4F91] m-0 mb-6">My Community</h1>

      {/* Search + Filters */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full border border-gray-300 rounded-full pl-10 pr-10 py-3 bg-white shadow-sm text-sm outline-none focus:border-[#1D4F91] focus:ring-2 focus:ring-blue-100 transition-all"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
          >
            <option value="">All Schools</option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>{abbr(s)}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>Class of {y}</option>
            ))}
          </select>
          {(schoolFilter || yearFilter) && (
            <button
              onClick={() => { setSchoolFilter(""); setYearFilter(""); }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-red-500 font-medium cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-[#1D4F91] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">
            {filtered.length} member{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.length === 0 ? (
            <Card className="text-center !py-12 text-gray-400">
              <div className="text-5xl mb-3">👥</div>
              <p>No members found matching your filters.</p>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((u) => {
                const userListings = listings[u.id] || { active: 0, sold: 0 };
                const userMkts = marketplaces[u.id] || 0;
                return (
                  <Card key={u.id} className="!p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900 m-0">{u.full_name}</p>
                        <p className="text-sm text-gray-500 mt-0.5 m-0">
                          {u.school ? abbr(u.school) : ""}{u.graduation_year ? ` · Class of ${u.graduation_year}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {userListings.active > 0 && (
                        <Badge color="green">
                          {userListings.active} active listing{userListings.active !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {userListings.sold > 0 && (
                        <Badge color="gray">
                          {userListings.sold} sold
                        </Badge>
                      )}
                      {userMkts > 0 && (
                        <Badge color="blue">
                          {userMkts} marketplace{userMkts !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {userListings.active === 0 && userListings.sold === 0 && userMkts === 0 && (
                        <span className="text-xs text-gray-400">No activity yet</span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
