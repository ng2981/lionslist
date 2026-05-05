import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { abbr } from "../utils/helpers";
import Button from "./ui/Button";
import MobileMenu from "./MobileMenu";

export default function NavBar() {
  const { profile, signOut, pendingCount } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <div className="text-white px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-50" style={{ background: 'var(--columbia-navy)', boxShadow: 'var(--shadow)' }}>
        <div
          className="text-xl md:text-[22px] font-bold tracking-tight cursor-pointer"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("lionslist:reset-home"));
            navigate("/home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <img src="/favicon-32.png" alt="" className="w-7 h-7 inline-block align-middle -mt-0.5" /> LionsList
        </div>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          <span
            className="text-sm opacity-90 cursor-pointer hover:underline"
            onClick={() => navigate("/profile")}
          >
            {profile?.full_name} · {profile?.school ? abbr(profile.school) : ""}
          </span>
          <button
            className="relative text-white text-xl bg-transparent border-none cursor-pointer ml-1 hover:opacity-80 transition-opacity"
            onClick={() => setMenuOpen(true)}
          >
            ☰
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCount > 10 ? "10+" : pendingCount}
              </span>
            )}
          </button>
        </div>
        {/* Mobile hamburger */}
        <button
          className="relative md:hidden text-white text-2xl bg-transparent border-none cursor-pointer"
          onClick={() => setMenuOpen(true)}
        >
          ☰
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pendingCount > 10 ? "10+" : pendingCount}
            </span>
          )}
        </button>
      </div>
      {menuOpen && (
        <MobileMenu
          profile={profile}
          onClose={() => setMenuOpen(false)}
          onLogout={handleLogout}
          onNavigate={(path) => {
            navigate(path);
            setMenuOpen(false);
          }}
        />
      )}
    </>
  );
}
