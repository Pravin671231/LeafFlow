import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForgotPasswordForm } from '../forms/auth/useForgotPasswordForm';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

const otpStepSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit code'),
});
type OtpStepValues = z.infer<typeof otpStepSchema>;

export function ForgotPassword() {
  const {
    step,
    emailForm,
    resetForm,
    onSubmitEmail,
    onSubmitOtp,
    onSubmitReset,
    isSending,
    isResetting,
    apiError,
  } = useForgotPasswordForm();

  const otpForm = useForm<OtpStepValues>({
    resolver: zodResolver(otpStepSchema),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body gap-5">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary">LeafFlow</h1>
            <p className="text-base-content/60 text-sm mt-1">Admin Portal</p>
          </div>

          <h2 className="text-xl font-semibold text-center">Reset Password</h2>

          {/* Steps indicator */}
          <ul className="steps w-full">
            <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Email</li>
            <li className={`step ${step >= 2 ? 'step-primary' : ''}`}>Verify</li>
            <li className={`step ${step >= 3 ? 'step-primary' : ''}`}>Password</li>
          </ul>

          {apiError && (
            <div role="alert" className="alert alert-error alert-soft text-sm">
              {apiError}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 1 && (
            <form
              onSubmit={emailForm.handleSubmit(onSubmitEmail)}
              className="flex flex-col gap-4"
              noValidate
            >
              <Input
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                error={emailForm.formState.errors.loginEmail?.message}
                {...emailForm.register('loginEmail')}
              />
              <Button type="submit" isLoading={isSending} className="w-full">
                Send OTP
              </Button>
              <div className="text-center">
                <Link to="/login" className="link link-primary text-sm">
                  Back to login
                </Link>
              </div>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <form
              onSubmit={otpForm.handleSubmit(onSubmitOtp)}
              className="flex flex-col gap-4"
              noValidate
            >
              <Input
                id="otp"
                label="Verification Code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                error={otpForm.formState.errors.otp?.message}
                {...otpForm.register('otp')}
              />
              <Button type="submit" className="w-full">
                Verify
              </Button>
            </form>
          )}

          {/* Step 3: New password */}
          {step === 3 && (
            <form
              onSubmit={resetForm.handleSubmit(onSubmitReset)}
              className="flex flex-col gap-4"
              noValidate
            >
              <Input
                id="new-password"
                label="New Password"
                type="password"
                autoComplete="new-password"
                error={resetForm.formState.errors.newPassword?.message}
                {...resetForm.register('newPassword')}
              />
              <Input
                id="confirm-password"
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                error={resetForm.formState.errors.confirmPassword?.message}
                {...resetForm.register('confirmPassword')}
              />
              <Button type="submit" isLoading={isResetting} className="w-full">
                Reset Password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
