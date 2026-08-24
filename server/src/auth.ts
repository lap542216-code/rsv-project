import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "msv-dev-secret-change-in-production";
const COOKIE_NAME = "msv_owner_session";

export interface OwnerPayload {
  ownerId: string;
  email: string;
}

/** Signs a session JWT and sets it as an httpOnly cookie. */
export function setSessionCookie(res: Response, payload: OwnerPayload): void {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    path: "/",
  });
}

/** Clears the session cookie. */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

/** Express middleware — rejects requests without a valid session cookie. */
export function requireOwnerAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as OwnerPayload;
    (req as Request & { owner: OwnerPayload }).owner = payload;
    next();
  } catch {
    res.status(401).json({ error: "Session expired or invalid" });
  }
}
