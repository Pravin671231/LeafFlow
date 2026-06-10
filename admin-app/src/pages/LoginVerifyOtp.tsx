import { useRef, useEffect } from 'react';
import { useVerifyOtpForm } from '../forms/auth/useVerifyOtpForm';
import { useCountdown } from '../hooks/useCountdown';
import { Button } from '../components/ui/Button';

export function LoginVerifyOtp() {
  const {
    form,
    digits,
    updateDigit,
    handleKeyDown,
    handlePaste,
    onSubmit,
    isLoading,
    apiError,
    expiresInSeconds,
    resendDisabled,
    handleResend,
  } = useVerifyOtpForm();

  const { formatted } = useCountdown(expiresInSeconds);
  const { handleSubmit, formState: { errors } } = form;

  const inputRefs = Array.from({ length: 6 }, () =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRef<HTMLInputElement>(null),
  );

  useEffect(() => {
    inputRefs[0]?.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body gap-5">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary">LeafFlow</h1>
            <p className="text-base-content/60 text-sm mt-1">Admin Portal</p>
          </div>

          <h2 className="text-xl font-semibold text-center">Verify OTP</h2>
          <p className="text-center text-base-content/60 text-sm">
            Enter the 6-digit code sent to your email
          </p>

          <div className="flex items-center justify-center gap-1 text-sm text-base-content/60">
            <span>Expires in:</span>
            <span className="font-mono font-semibold text-primary">{formatted}</span>
          </div>

          {apiError && (
            <div role="alert" className="alert alert-error alert-soft text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
            <div className="flex justify-center gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  aria-label={index === 0 ? 'Verification Code' : undefined}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  className="input w-12 h-12 text-center text-xl font-bold p-0"
                  onChange={(e) => updateDigit(index, e.target.value, inputRefs)}
                  onKeyDown={(e) => handleKeyDown(index, e, inputRefs)}
                  onPaste={(e) => handlePaste(e, inputRefs)}
                />
              ))}
            </div>

            {errors.otp && (
              <p className="text-error text-xs text-center">{errors.otp.message}</p>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full">
              Verify
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={resendDisabled}
                onClick={handleResend}
              >
                Resend
              </button>
              {resendDisabled && (
                <p className="text-xs text-base-content/50 mt-1">
                  Resend available in 60s
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
