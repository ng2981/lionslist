import { CATEGORIES } from "../constants/categories";

const TOP_CATEGORIES = CATEGORIES.slice(0, 9);

export default function CategoryGrid({ onCategoryClick }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
      {/* Move Out Sale special category */}
      <div
        onClick={() => onCategoryClick("Move Out Sale")}
        className="bg-gradient-to-br from-[#DCE9F5] to-[#9BCBEB] rounded-xl py-5 px-3 text-center cursor-pointer shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
      >
        <div className="text-4xl mb-2">📦</div>
        <div className="text-xs font-semibold text-[#002B5C]">Move Out Sale</div>
      </div>
      {TOP_CATEGORIES.map((c) => (
        <div
          key={c.name}
          onClick={() => onCategoryClick(c.name)}
          className="bg-[#F8FAFC] rounded-xl py-5 px-3 text-center cursor-pointer shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:bg-[#DCE9F5]"
        >
          <div className="text-4xl mb-2">{c.icon}</div>
          <div className="text-xs font-semibold text-gray-700">{c.name}</div>
        </div>
      ))}
    </div>
  );
}
