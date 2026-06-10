type Variant = 'primary' | 'ghost' | 'error' | 'outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  error: 'btn-error',
  outline: 'btn-outline',
};

export function Button({
  children,
  isLoading = false,
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn ${variantClass[variant]} ${className}`}
      disabled={disabled ?? isLoading}
      {...props}
    >
      {isLoading && <span className="loading loading-spinner loading-sm" />}
      {children}
    </button>
  );
}
