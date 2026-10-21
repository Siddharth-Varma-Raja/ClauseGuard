type FormFieldProps = {
    label: string;
    error?: string;
    className?: string;
    children: React.ReactNode;
}

export default function FormField({
    label,
    error,
    className,
    children,
}: FormFieldProps) {
    return (
        <div className={className}>
            <label className="mb-1.5 block text-sm font-medium">
                {label}
            </label>

            {children}

            {error && (
                <p className="mt-1 text-sm text-bad" role="alert">
                    {error}
                </p>
            )}
        </div>
    )
}