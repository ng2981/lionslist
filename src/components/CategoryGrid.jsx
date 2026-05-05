import { CATEGORIES } from "../constants/categories";

const TOP_CATEGORIES = CATEGORIES.slice(0, 9);

export default function CategoryGrid({ onCategoryClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
      {/* Move Out Sale special category */}
      <div
        onClick={() => onCategoryClick("Move Out Sale")}
        className="category-card"
        style={{ background: 'var(--columbia-navy)', borderColor: 'transparent' }}
      >
        <div className="cat-icon" style={{ background: 'rgba(185,217,235,0.2)' }}>
          📦
        </div>
        <div className="cat-name" style={{ color: 'white' }}>Move Out Sale</div>
      </div>
      {TOP_CATEGORIES.map((c) => (
        <div
          key={c.name}
          onClick={() => onCategoryClick(c.name)}
          className="category-card"
        >
          <div className="cat-icon">{c.icon}</div>
          <div className="cat-name">{c.name}</div>
        </div>
      ))}
    </div>
  );
}
