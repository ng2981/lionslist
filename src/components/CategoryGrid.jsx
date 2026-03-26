import { CATEGORIES } from "../constants/categories";

export default function CategoryGrid({ onCategoryClick }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
      {CATEGORIES.map((c) => (
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
