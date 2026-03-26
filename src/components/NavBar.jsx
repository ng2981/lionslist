import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { abbr } from "../utils/helpers";
import Button from "./ui/Button";
import MobileMenu from "./MobileMenu";

export default function NavBar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <div className="bg-[#002B5C] text-white px-4 md:px-6 py-3 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div
          className="text-xl md:text-[22px] font-bold tracking-tight cursor-pointer"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("lionslist:reset-home"));
            navigate("/home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          🦁 LionsList
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
            className="text-white text-xl bg-transparent border-none cursor-pointer ml-1 hover:opacity-80 transition-opacity"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
        </div>
        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white text-2xl bg-transparent border-none cursor-pointer"
          onClick={() => setMenuOpen(true)}
        >
          ☰
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
