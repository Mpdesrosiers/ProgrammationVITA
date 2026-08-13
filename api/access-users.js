import {
  mondayRequest,
  requireSession,
} from "./auth/_shared.js";

export default async function handler(req, res) {
  const session = requireSession(req, res, {
    area: "access",
    write: true,
  });
  if (!session) return;

  try {
    const board = Number(process.env.AUTH_ACCESS_BOARD_ID);
    const emailColumn = process.env.AUTH_EMAIL_COLUMN_ID;
    const roleColumn = process.env.AUTH_ROLE_COLUMN_ID;
    const logisticsRoleColumn = "color_mm66f4ct";
    const activeColumn = process.env.AUTH_ACTIVE_COLUMN_ID;

    if (req.method === "GET") {
      const data = await mondayRequest(`
        query {
          boards(ids: [${board}]) {
            items_page(limit: 500) {
              items {
                id
                name
                column_values(ids: [
                  "${emailColumn}",
                  "${roleColumn}",
                  "${logisticsRoleColumn}",
                  "${activeColumn}"
                ]) { id text }
              }
            }
          }
        }
      `);
      const users =
        data.data?.boards?.[0]?.items_page?.items?.map((item) => {
          const get = (id) =>
            item.column_values?.find((column) => column.id === id)?.text || "";
          return {
            id: item.id,
            name: item.name,
            email: get(emailColumn),
            programmingRole: get(roleColumn),
            logisticsRole: get(logisticsRoleColumn),
            active: get(activeColumn),
          };
        }) || [];
      return res.status(200).json({ users });
    }

    if (req.method === "POST") {
      const {
        name,
        email,
        programmingRole,
        logisticsRole,
        active = "Oui",
      } = req.body || {};
      if (!name?.trim() || !email?.trim()) {
        return res.status(400).json({ error: "Nom et courriel requis." });
      }
      if (!email.toLowerCase().endsWith(`@${process.env.AUTH_ALLOWED_DOMAIN.toLowerCase()}`)) {
        return res.status(400).json({ error: "Domaine de courriel non autorisé." });
      }
      const values = {
        [emailColumn]: email.trim().toLowerCase(),
        [roleColumn]: {
          label: programmingRole,
        },
        [logisticsRoleColumn]: {
          label: logisticsRole,
        },
        [activeColumn]: { label: active },
      };
      await mondayRequest(`
        mutation {
          create_item(
            board_id: ${board}
            item_name: ${JSON.stringify(name.trim())}
            column_values: ${JSON.stringify(JSON.stringify(values))}
          ) { id }
        }
      `);
      return res.status(200).json({ success: true });
    }

    if (req.method === "PUT") {
      const {
        itemId,
        programmingRole,
        logisticsRole,
        active,
      } = req.body || {};
      const values = {
        [roleColumn]: {
          label: programmingRole,
        },
        [logisticsRoleColumn]: {
          label: logisticsRole,
        },
        [activeColumn]: { label: active },
      };
      await mondayRequest(`
        mutation {
          change_multiple_column_values(
            board_id: ${board}
            item_id: ${Number(itemId)}
            column_values: ${JSON.stringify(JSON.stringify(values))}
          ) { id }
        }
      `);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Méthode non supportée." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
