type InputProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
};

export default function Input({label, name, type = "text", placeholder, required = false,}: InputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-sm font-medium"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}