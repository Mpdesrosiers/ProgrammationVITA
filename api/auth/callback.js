import {
  clearOAuthState,
  findAccess,
  getOAuthState,
  setSession,
  verifyMicrosoftToken,
} from "./_shared.js";

export default async function handler(req, res) {
  try {
    const saved = getOAuthState(req);
    if (!saved || saved.state !== req.query.state) {
      throw new Error("État de connexion invalide ou expiré.");
    }
    const tenant = process.env.MICROSOFT_TENANT_ID;
    const response = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET,
          code: req.query.code,
          grant_type: "authorization_code",
          redirect_uri: `${process.env.APP_URL}/api/auth/callback`,
        }),
      }
    );
    const token = await response.json();
    if (!response.ok || !token.id_token) {
      throw new Error(token.error_description || "Connexion Microsoft refusée.");
    }
    const profile = await verifyMicrosoftToken(token.id_token, saved.nonce);
    const email = String(
      profile.preferred_username || profile.email || ""
    ).toLowerCase();
    const domain = process.env.AUTH_ALLOWED_DOMAIN.toLowerCase();
    if (!email.endsWith(`@${domain}`)) {
      throw new Error("Ce compte ne fait pas partie du domaine autorisé.");
    }
    const access = await findAccess(email);
    const isAdmin =
      email === process.env.AUTH_ADMIN_EMAIL.toLowerCase();
    if (!isAdmin && (!access || access.active !== "Oui")) {
      throw new Error("Votre compte n'est pas autorisé dans Monday.");
    }
    const programmingRole = isAdmin
      ? "Modification"
      : access.programmingRole;
    const logisticsRole = isAdmin
      ? "Modification"
      : access.logisticsRole;
    const validRoles = [
      "Modification",
      "Consultation",
      "Aucun accès",
    ];
    if (
      !validRoles.includes(programmingRole) ||
      !validRoles.includes(logisticsRole)
    ) {
      throw new Error("Un des rôles Monday n'est pas valide.");
    }
    if (
      programmingRole === "Aucun accès" &&
      logisticsRole === "Aucun accès"
    ) {
      throw new Error("Votre compte n'a accès à aucune section.");
    }
    clearOAuthState(res);
    setSession(res, {
      email,
      name: profile.name || access?.name || email,
      programmingRole,
      logisticsRole,
    });
    res.redirect(process.env.APP_URL);
  } catch (error) {
    clearOAuthState(res);
    res.redirect(
      `${process.env.APP_URL}/?authError=${encodeURIComponent(error.message)}`
    );
  }
}
