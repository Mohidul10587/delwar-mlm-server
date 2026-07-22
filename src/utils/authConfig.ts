import dotenv from "dotenv";
dotenv.config();
/**
 * Central config — JWT secrets and cookie options.
 * Throws at startup if required env vars are missing.
 */

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET environment variable is required");
}

export const JWT_SECRET: string = process.env.JWT_SECRET;
export const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET;

export const cookieOpts = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction, // true in production
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    // Add this for explicit cross-domain support
    ...(isProduction && { domain: undefined }), // Let browser handle domain
  };
};
