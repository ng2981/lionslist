export default function Card({ children, className = "", hover, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`p-6 transition-all duration-200
        ${hover ? "hover:-translate-y-0.5" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}`}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {children}
    </div>
  );
}
