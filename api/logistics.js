import {
  mondayRequest,
  requireSession,
} from "./auth/_shared.js";

const BOARD_ID = 18426480659;

const COLUMNS = {
  start: "date4",
  end: "date_mm667426",
  responsible: "dropdown_mm668yr",
  people: "person",
  status: "color_mm6622h",
  departure: "text_mm66xzp4",
  arrival: "text_mm667te8",
  type: "color_mm66qgbk",
};

function parseDateColumn(column) {
  if (!column?.value) return null;
  try {
    const value = JSON.parse(column.value);
    return value.date
      ? {
          date: value.date,
          time: (value.time || "00:00:00").slice(0, 5),
        }
      : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const session = requireSession(
    req,
    res,
    {
      area: "logistics",
      write: req.method !== "GET",
    }
  );
  if (!session) return;

  try {
    if (req.method === "GET") {
      const fields = `
        id
        name
        updated_at
        column_values(ids: ${JSON.stringify(Object.values(COLUMNS))}) {
          id
          text
          value
        }
      `;
      const first = await mondayRequest(`
        query {
          boards(ids: [${BOARD_ID}]) {
            items_page(limit: 500) {
              cursor
              items { ${fields} }
            }
          }
        }
      `);
      const page = first.data?.boards?.[0]?.items_page;
      const items = [...(page?.items || [])];
      let cursor = page?.cursor;
      const visited = new Set();

      while (cursor && !visited.has(cursor)) {
        visited.add(cursor);
        const next = await mondayRequest(`
          query {
            next_items_page(
              limit: 500
              cursor: ${JSON.stringify(cursor)}
            ) {
              cursor
              items { ${fields} }
            }
          }
        `);
        const nextPage = next.data?.next_items_page;
        items.push(...(nextPage?.items || []));
        cursor = nextPage?.cursor;
      }

      const actions = items.map((item) => {
        const column = (id) =>
          item.column_values?.find((value) => value.id === id);
        let peopleEntities = [];
        try {
          peopleEntities =
            JSON.parse(
              column(COLUMNS.people)?.value || "{}"
            ).personsAndTeams || [];
        } catch {
          peopleEntities = [];
        }

        return {
          id: item.id,
          action: item.name,
          start: parseDateColumn(column(COLUMNS.start)),
          end: parseDateColumn(column(COLUMNS.end)),
          responsible: column(COLUMNS.responsible)?.text || "",
          people: column(COLUMNS.people)?.text || "",
          peopleEntities,
          status: column(COLUMNS.status)?.text || "",
          departure: column(COLUMNS.departure)?.text || "",
          arrival: column(COLUMNS.arrival)?.text || "",
          type: column(COLUMNS.type)?.text || "",
          updatedAt: item.updated_at,
        };
      });

      const personIds = [
        ...new Set(
          actions.flatMap((action) =>
            action.peopleEntities
              .filter(
                (entity) =>
                  entity.kind === "person"
              )
              .map((entity) => entity.id)
          )
        ),
      ];

      let emailByPersonId = new Map();

      if (personIds.length) {
        const usersData = await mondayRequest(`
          query {
            users(ids: [${personIds
              .map(Number)
              .join(",")}]) {
              id
              email
            }
          }
        `);

        emailByPersonId = new Map(
          (usersData.data?.users || []).map(
            (user) => [
              String(user.id),
              user.email?.toLowerCase(),
            ]
          )
        );
      }

      const currentEmail =
        session.email.toLowerCase();

      const enrichedActions = actions.map(
        (action) => ({
          ...action,
          isMine:
            action.peopleEntities.some(
              (entity) =>
                entity.kind === "person" &&
                emailByPersonId.get(
                  String(entity.id)
                ) === currentEmail
            ),
          peopleEntities: undefined,
        })
      );

      return res.status(200).json({
        actions: enrichedActions,
      });
    }

    if (req.method === "PUT") {
      const { itemId, status } = req.body || {};
      if (!itemId || !status) {
        return res.status(400).json({ error: "Item et statut requis." });
      }
      const values = {
        [COLUMNS.status]: { label: status },
      };
      await mondayRequest(`
        mutation {
          change_multiple_column_values(
            board_id: ${BOARD_ID}
            item_id: ${Number(itemId)}
            column_values: ${JSON.stringify(JSON.stringify(values))}
          ) { id }
        }
      `);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Méthode non supportée." });
  } catch (error) {
    return res.status(500).json({
      error: "Impossible de charger la logistique.",
      details: error.message,
    });
  }
}
