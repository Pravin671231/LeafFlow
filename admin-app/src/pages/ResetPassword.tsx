import { Link } from 'react-router-dom';
import { useResetPasswordForm } from '../forms/auth/useResetPasswordForm';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Navbar } from '../components/layout/Navbar';

export function ResetPassword() {
  const {
    step,
    form,
    onSendOtp,
    onSubmit,
    isSending,
    isConfirming,
    apiError,
    success,
  } = useResetPasswordForm();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <div className="flex justify-center pt-12 px-4">
        <div className="card w-full max-w-sm bg-base-100 shadow-xl">
          <div className="card-body gap-5">
            <div>
              <Link to="/dashboard" className="link link-primary text-sm">
                ← Back to Dashboard
              </Link>
            </div>

            <h2 className="text-xl font-semibold">Change Password</h2>

            {/* Steps indicator */}
            <ul className="steps w-full">
              <li className={`step ${step >= 1 ? 'step-primary' : ''}`}>Send OTP</li>
              <li className={`step ${step >= 2 ? 'step-primary' : ''}`}>New Password</li>
            </ul>

            {apiError && (
              <div role="alert" className="alert alert-error alert-soft text-sm">
                {apiError}
              </div>
            )}

            {success ? (
              <div className="flex flex-col gap-4 items-center text-center">
                <div role="alert" className="alert alert-success alert-soft w-full">
                  Password updated successfully!
                </div>
                <Link to="/dashboard" className="btn btn-primary btn-sm">
                  Back to Dashboard
                </Link>
              </div>
            ) : step === 1 ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-base-content/60">
                  We&apos;ll send a one-time code to your registered OTP delivery email.
                </p>
                <Button
                  type="button"
                  isLoading={isSending}
                  className="w-full"
                  onClick={onSendOtp}
                >
                  Send OTP to my email
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
                noValidate
              >
                <Input
                  id="otp"
                  label="Verification Code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  error={errors.otp?.message}
                  {...register('otp')}
                />
                <Input
                  id="new-password"
                  label="New Password"
                  type="password"
                  autoComplete="new-password"
                  error={errors.newPassword?.message}
                  {...register('newPassword')}
                />
                <Input
                  id="confirm-password"
                  label="Confirm Password"
                  type="password"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <Button type="submit" isLoading={isConfirming} className="w-full">
                  Update Password
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
