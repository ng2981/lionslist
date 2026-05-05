const colors = {
  blue: "bg-[#B9D9EB] text-[#002663]",
  green: "bg-green-100 text-green-600",
  red: "bg-red-100 text-red-500",
  gray: "bg-gray-100 text-gray-500",
  yellow: "bg-amber-100 text-amber-700",
};

export default function Badge({ children, color = "blue" }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold ${colors[color] || colors.blue}`}
      style={{ borderRadius: 'var(--radius-pill)' }}
    >
      {children}
    </span>
  );
}
