import Field from "./Field";

export default function TextArea({ label, error, className = "", ...props }) {
  return (
    <Field label={label} error={error}>
      <textarea
        className={`w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm outline-none box-border min-h-[80px] resize-y
          focus:border-[#002B5C] focus:ring-1 focus:ring-[#002B5C] ${className}`}
        {...props}
      />
    </Field>
  );
}
