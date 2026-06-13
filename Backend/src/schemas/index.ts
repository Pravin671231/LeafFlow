export {
  loginSchema,
  verifyOtpSchema,
  refreshSchema,
  forgotPasswordSendSchema,
  forgotPasswordResetSchema,
  resetPasswordSendSchema,
  resetPasswordConfirmSchema,
} from "./adminAuth.schema";
export type {
  LoginBody,
  VerifyOtpBody,
  ForgotPasswordSendBody,
  ForgotPasswordResetBody,
  ResetPasswordConfirmBody,
} from "./adminAuth.schema";
export { sendOtpSchema, verifyBuyerOtpSchema, googleOneTapSchema } from "./buyerAuth.schema";
export type { SendOtpBody, VerifyBuyerOtpBody, GoogleOneTapBody } from "./buyerAuth.schema";
