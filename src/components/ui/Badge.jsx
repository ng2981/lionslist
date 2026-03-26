const colors = {
  blue: "bg-[#DCE9F5] text-[#002B5C]",
  green: "bg-green-100 text-green-600",
  red: "bg-red-100 text-red-500",
  gray: "bg-gray-100 text-gray-500",
};

export default function Badge({ children, color = "blue" }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${colors[color] || colors.blue}`}
    >
      {children}
    </span>
  );
}
