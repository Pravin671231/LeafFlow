import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";

export interface GoogleProfile {
  googleId: string;
  email: string;
  name?: string;
}

function buildClient(): OAuth2Client {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new AppError(503, "GOOGLE_OAUTH_UNAVAILABLE", "Google OAuth is not configured");
  }
  return new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

export async function getGoogleAuthUrl(): Promise<string> {
  const client = buildClient();
  return client.generateAuthUrl({
    scope: ["email", "profile"],
    access_type: "offline",
  });
}

export async function verifyGoogleCode(code: string): Promise<GoogleProfile> {
  const client = buildClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new AppError(401, "INVALID_TOKEN", "Google did not return an ID token");
  }
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new AppError(401, "INVALID_TOKEN", "Invalid Google token payload");
  }
  return { googleId: payload.sub, email: payload.email, name: payload.name };
}

export async function verifyGoogleOneTap(credential: string): Promise<GoogleProfile> {
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new AppError(401, "INVALID_TOKEN", "Invalid Google One Tap token");
  }
  return { googleId: payload.sub, email: payload.email, name: payload.name };
}
