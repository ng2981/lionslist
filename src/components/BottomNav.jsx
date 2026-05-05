import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, PlusCircle, ClipboardList, Clock, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import SellSheet from "./SellSheet";

const tabs = [
  { path: "/home", label: "Home", icon: Home },
  { path: "/my-listings", label: "Listings", icon: ClipboardList },
  { path: "sell", label: "Sell", icon: PlusCircle, primary: true },
  { path: "/pending", label: "Pending", icon: Clock },
  { path: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pendingCount } = useAuth();
  const [sellOpen, setSellOpen] = useState(false);

  const isActive = (path) => {
    if (path === "sell") return false;
    return location.pathname === path;
  };

  const handleClick = (tab) => {
    if (tab.path === "sell") {
      setSellOpen(true);
      return;
    }
    navigate(tab.path);
  };

  return (
  <>
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-end justify-around px-2 pt-1 pb-2">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;

          if (tab.primary) {
            return (
              <button
                key={tab.path}
                onClick={() => handleClick(tab)}
                className="flex flex-col items-center gap-0.5 -mt-3 bg-transparent border-none cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#002B5C] flex items-center justify-center shadow-lg">
                  <Icon size={24} className="text-white" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-semibold text-[#002B5C]">
                  {tab.label}
                </span>
              </button>
            );
          }

          const showBadge = (tab.path === "/pending" || tab.path === "/my-listings") && pendingCount > 0;
          return (
            <button
              key={tab.path}
              onClick={() => handleClick(tab)}
              className={`relative flex flex-col items-center gap-0.5 pt-1.5 bg-transparent border-none cursor-pointer min-w-[56px] ${
                active ? "text-[#002B5C]" : "text-gray-400"
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingCount > 10 ? "10+" : pendingCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>

    <SellSheet open={sellOpen} onClose={() => setSellOpen(false)} />
  </>
  );
}
