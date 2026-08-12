import { clearSession } from "./_shared.js";

export default function handler(req, res) {
  clearSession(res);
  res.redirect(process.env.APP_URL);
}
