import { getSession } from "./_shared.js";

export default function handler(req, res) {
  const user = getSession(req);
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }
  return res.status(200).json({ authenticated: true, user });
}
