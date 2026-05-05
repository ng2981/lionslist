import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Package, X } from "lucide-react";

export default function SellSheet({ open, onClose }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleOption = (action) => {
    handleClose();
    setTimeout(() => {
      if (action === "single") {
        navigate("/sell");
      } else {
        navigate("/move-out-sale");
      }
    }, 300);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pb-6">
          <h2 className="text-lg font-bold text-gray-900 text-center mb-5">
            What would you like to sell?
          </h2>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleOption("single")}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-left cursor-pointer hover:bg-gray-100 active:bg-gray-100 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[#DCE9F5] flex items-center justify-center shrink-0">
                <ShoppingBag size={22} className="text-[#002B5C]" strokeWidth={2} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-[15px]">
                  Sell a single item
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  List one item for sale in a category
                </p>
              </div>
            </button>

            <button
              onClick={() => handleOption("moveout")}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-left cursor-pointer hover:bg-gray-100 active:bg-gray-100 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-[#DCE9F5] flex items-center justify-center shrink-0">
                <Package size={22} className="text-[#002B5C]" strokeWidth={2} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-[15px]">
                  Move Out Sale
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  List multiple items at once as a bundle
                </p>
              </div>
            </button>
          </div>

          <button
            onClick={handleClose}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-gray-200 text-gray-500 font-medium text-[15px] cursor-pointer hover:bg-gray-50 active:bg-gray-50 transition-colors"
          >
            <X size={18} strokeWidth={2} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
