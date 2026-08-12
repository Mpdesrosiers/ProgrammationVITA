import crypto from "node:crypto";
import {
  setOAuthState,
  validateAuthConfig,
} from "./_shared.js";

export default function handler(req, res) {
  try {
    validateAuthConfig();
    const state = crypto.randomBytes(24).toString("base64url");
    const nonce = crypto.randomBytes(24).toString("base64url");
    setOAuthState(res, { state, nonce });
    const tenant = process.env.MICROSOFT_TENANT_ID;
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      response_type: "code",
      redirect_uri: `${process.env.APP_URL}/api/auth/callback`,
      response_mode: "query",
      scope: "openid profile email",
      state,
      nonce,
    });
    res.redirect(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`
    );
  } catch (error) {
    res.status(500).json({
      error: "Configuration de connexion incomplète.",
      details: error.message,
    });
  }
}
