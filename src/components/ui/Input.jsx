import Field from "./Field";

export default function Input({ label, error, className = "", ...props }) {
  return (
    <Field label={label} error={error}>
      <input
        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none box-border
          ${error ? "border-red-500" : "border-gray-300"} focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C]
          ${className}`}
        {...props}
      />
    </Field>
  );
}
