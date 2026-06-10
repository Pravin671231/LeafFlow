import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      <label className="floating-label">
        <input
          id={id}
          ref={ref}
          className={`input w-full ${error ? 'input-error' : ''} ${className}`}
          placeholder={label}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  ),
);

Input.displayName = 'Input';
