import { abbr } from "../utils/helpers";
import Button from "./ui/Button";

export default function MobileMenu({ profile, onClose, onLogout, onNavigate }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="self-end text-2xl text-gray-500 bg-transparent border-none cursor-pointer mb-4"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="mb-6">
          <p className="font-bold text-gray-900">{profile?.full_name}</p>
          <p className="text-sm text-gray-500">
            {profile?.school ? abbr(profile.school) : ""}
          </p>
          <p className="text-sm text-gray-400">{profile?.email}</p>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <button
            className="text-left px-4 py-3 rounded-lg hover:bg-gray-100 font-medium text-gray-700"
            onClick={() => onNavigate("/home")}
          >
            Home
          </button>
          <button
            className="text-left px-4 py-3 rounded-lg hover:bg-gray-100 font-medium text-gray-700"
            onClick={() => onNavigate("/profile")}
          >
            My Profile
          </button>
          <button
            className="text-left px-4 py-3 rounded-lg hover:bg-gray-100 font-medium text-gray-700"
            onClick={() => onNavigate("/community")}
          >
            My Community
          </button>
          <button
            className="text-left px-4 py-3 rounded-lg hover:bg-gray-100 font-medium text-[#002B5C]"
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
