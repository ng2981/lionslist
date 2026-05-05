import { abbr } from "../utils/helpers";
import { useAuth } from "../hooks/useAuth";
import Button from "./ui/Button";

export default function MobileMenu({ profile, onClose, onLogout, onNavigate }) {
  const { pendingCount } = useAuth();
  return (
    <div className="fixed inset-0 z-[200] bg-black/50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl px-6 pt-3 pb-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="self-end text-2xl text-gray-500 bg-transparent border-none cursor-pointer mb-2"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="mb-4">
          <p className="font-bold text-gray-900 m-0">{profile?.full_name}</p>
          <p className="text-sm text-gray-500 m-0 mt-0.5">
            {profile?.school ? abbr(profile.school) : ""}
          </p>
          <p className="text-sm text-gray-400 m-0 mt-0.5">{profile?.email}</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <button
            className="text-left px-4 py-2.5 rounded-lg hover:bg-gray-100 font-medium text-gray-700 bg-transparent border-none cursor-pointer"
            onClick={() => onNavigate("/home")}
          >
            Home
          </button>
          <button
            className="text-left px-4 py-2.5 rounded-lg hover:bg-gray-100 font-medium text-gray-700 bg-transparent border-none cursor-pointer"
            onClick={() => onNavigate("/profile")}
          >
            My Profile
          </button>
          <button
            className="text-left px-4 py-2.5 rounded-lg hover:bg-gray-100 font-medium text-gray-700 bg-transparent border-none cursor-pointer"
            onClick={() => onNavigate("/sell")}
          >
            Sell an Item
          </button>
          <button
            className="text-left px-4 py-2.5 rounded-lg hover:bg-gray-100 font-medium text-gray-700 bg-transparent border-none cursor-pointer"
            onClick={() => onNavigate("/move-out-sale")}
          >
            Move Out Sale
          </button>
          <button
            className="text-left px-4 py-2.5 rounded-lg hover:bg-gray-100 font-medium text-gray-700 bg-transparent border-none cursor-pointer flex items-center gap-2"
            onClick={() => onNavigate("/my-listings")}
          >
            My Listings
            {pendingCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCount > 10 ? "10+" : pendingCount}
              </span>
            )}
          </button>
          <button
            className="text-left px-4 py-2.5 rounded-lg hover:bg-gray-100 font-medium text-gray-700 bg-transparent border-none cursor-pointer flex items-center gap-2"
            onClick={() => onNavigate("/pending")}
          >
            Pending
            {pendingCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCount > 10 ? "10+" : pendingCount}
              </span>
            )}
          </button>
          <button
            className="text-left px-4 py-2.5 rounded-lg hover:bg-gray-100 font-medium text-gray-700 bg-transparent border-none cursor-pointer"
            onClick={() => onNavigate("/community")}
          >
            My Community
          </button>
          <button
            className="text-left px-4 py-2.5 rounded-lg hover:bg-gray-100 font-medium text-[#002B5C] bg-transparent border-none cursor-pointer"
            onClick={() => onNavigate("/feedback")}
          >
            Share Feedback
          </button>
        </nav>
        <Button variant="danger" full onClick={onLogout}>
          Log Out
        </Button>
      </div>
    </div>
  );
}
