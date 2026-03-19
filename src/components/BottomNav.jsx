import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";
import SellSheet from "./SellSheet";

const tabs = [
  { path: "/home", label: "Home", icon: Home },
  { path: "/marketplace/search", label: "Browse", icon: Search },
  { path: "sell", label: "Sell", icon: PlusCircle, primary: true },
  { path: "/messages", label: "Messages", icon: MessageCircle },
  { path: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
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
                <div className="w-12 h-12 rounded-full bg-[#1D4F91] flex items-center justify-center shadow-lg">
                  <Icon size={24} className="text-white" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-semibold text-[#1D4F91]">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => handleClick(tab)}
              className={`flex flex-col items-center gap-0.5 pt-1.5 bg-transparent border-none cursor-pointer min-w-[56px] ${
                active ? "text-[#1D4F91]" : "text-gray-400"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
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
