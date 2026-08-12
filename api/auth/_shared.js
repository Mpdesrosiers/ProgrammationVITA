import crypto from "node:crypto";
import {
  createRemoteJWKSet,
  jwtVerify,
} from "jose";

const SESSION_COOKIE = "vita_session";
const OAUTH_COOKIE = "vita_oauth_state";

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return [
          part.slice(0, separator),
          decodeURIComponent(part.slice(separator + 1)),
        ];
      })
  );
}

function sign(value) {
  return crypto
    .createHmac(
      "sha256",
      process.env.AUTH_SESSION_SECRET
    )
    .update(value)
    .digest("base64url");
}

export function createSignedValue(payload) {
  const value = Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");
  return `${value}.${sign(value)}`;
}

export function readSignedValue(value) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return null;
  }
  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );
  } catch {
    return null;
  }
}

export function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookie(name) {
  return cookie(name, "", 0);
}

export function getOAuthState(req) {
  return readSignedValue(parseCookies(req)[OAUTH_COOKIE]);
}

export function setOAuthState(res, payload) {
  res.setHeader(
    "Set-Cookie",
    cookie(OAUTH_COOKIE, createSignedValue(payload), 600)
  );
}

export function clearOAuthState(res) {
  res.setHeader("Set-Cookie", clearCookie(OAUTH_COOKIE));
}

export function setSession(res, user) {
  const payload = {
    ...user,
    exp: Date.now() + 8 * 60 * 60 * 1000,
  };
  res.setHeader(
    "Set-Cookie",
    cookie(SESSION_COOKIE, createSignedValue(payload), 28800)
  );
}

export function clearSession(res) {
  res.setHeader("Set-Cookie", clearCookie(SESSION_COOKIE));
}

export function getSession(req) {
  const session = readSignedValue(
    parseCookies(req)[SESSION_COOKIE]
  );
  if (!session || session.exp < Date.now()) return null;
  return session;
}

export function requireSession(req, res, write = false) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Connexion requise." });
    return null;
  }
  if (write && session.role !== "Modification") {
    res.status(403).json({
      error: "Votre accès est en mode consultation.",
    });
    return null;
  }
  return session;
}

export async function mondayRequest(query) {
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_TOKEN,
    },
    body: JSON.stringify({ query }),
  });
  const data = await response.json();
  if (!response.ok || data.errors) {
    throw new Error(
      data.errors?.map((error) => error.message).join(" | ") ||
        `Erreur HTTP Monday: ${response.status}`
    );
  }
  return data;
}

export async function findAccess(email) {
  const boardId = Number(process.env.AUTH_ACCESS_BOARD_ID);
  const emailColumn = process.env.AUTH_EMAIL_COLUMN_ID;
  const roleColumn = process.env.AUTH_ROLE_COLUMN_ID;
  const activeColumn = process.env.AUTH_ACTIVE_COLUMN_ID;
  const data = await mondayRequest(`
    query {
      boards(ids: [${boardId}]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values(ids: [
              "${emailColumn}",
              "${roleColumn}",
              "${activeColumn}"
            ]) { id text }
          }
        }
      }
    }
  `);
  const normalized = email.trim().toLowerCase();
  const item = data.data?.boards?.[0]?.items_page?.items?.find(
    (candidate) =>
      candidate.column_values?.find(
        (column) => column.id === emailColumn
      )?.text?.trim().toLowerCase() === normalized
  );
  if (!item) return null;
  const get = (id) =>
    item.column_values?.find((column) => column.id === id)?.text || "";
  return {
    itemId: item.id,
    name: item.name,
    email: normalized,
    role: get(roleColumn),
    active: get(activeColumn),
  };
}

export async function verifyMicrosoftToken(idToken, nonce) {
  const tenant = process.env.MICROSOFT_TENANT_ID;
  const client = process.env.MICROSOFT_CLIENT_ID;
  const jwks = createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`)
  );
  const { payload } = await jwtVerify(idToken, jwks, {
    audience: client,
    issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
  });
  if (payload.nonce !== nonce) {
    throw new Error("Nonce Microsoft invalide.");
  }
  return payload;
}

export { OAUTH_COOKIE };
