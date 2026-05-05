const variants = {
  primary: "bg-[#002663] text-white hover:bg-[#001A4A]",
  secondary: "bg-white text-[#002B5C] border-2 border-[#002B5C] hover:bg-[#DCE9F5]",
  danger: "bg-white text-red-500 border-2 border-red-500 hover:bg-red-50",
  success: "bg-green-600 text-white hover:bg-green-700",
  ghost: "bg-transparent text-[#002B5C] hover:bg-gray-100",
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1fb855]",
};

export default function Button({
  children,
  variant = "primary",
  small,
  full,
  className = "",
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all cursor-pointer
        ${small ? "px-3.5 py-1.5 text-[13px]" : "px-5 py-2.5 text-sm"}
        ${full ? "w-full" : ""}
        ${variants[variant] || variants.primary}
        ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
