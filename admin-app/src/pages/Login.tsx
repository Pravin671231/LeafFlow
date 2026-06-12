import { Link } from 'react-router-dom';
import { useLoginForm } from '../forms/auth/useLoginForm';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../routes/routes';

export function Login() {
  const { form, onSubmit, isLoading, apiError } = useLoginForm();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body gap-5">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary">LeafFlow</h1>
            <p className="text-base-content/60 text-sm mt-1">Admin Portal</p>
          </div>

          <h2 className="text-xl font-semibold text-center">Sign in</h2>

          {apiError && (
            <div role="alert" className="alert alert-error alert-soft text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              id="loginEmail"
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.loginEmail?.message}
              {...register('loginEmail')}
            />

            <div className="flex flex-col gap-1">
              <Input
                id="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="text-right">
                <Link to={ROUTES.FORGOT_PASSWORD} className="link link-primary text-xs">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full mt-1">
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
