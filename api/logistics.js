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
  notes: "text_mm66r4hv",
};

function parseDateColumn(column) {
  if (!column?.value) return null;
  try {
    const value = JSON.parse(column.value);
    if (!value.date) return null;

    /*
     * Les colonnes Date + heure de Monday sont reçues en UTC.
     * La logistique doit afficher l'heure locale de Montréal,
     * y compris lors des changements d'heure saisonniers.
     */
    const utcDate = new Date(
      `${value.date}T${value.time || "00:00:00"}Z`
    );
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(utcDate);
    const getPart = (type) =>
      parts.find((part) => part.type === type)?.value;

    return {
      date: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
      time: `${getPart("hour")}:${getPart("minute")}`,
    };
  } catch {
    return null;
  }
}

function torontoDateTimeToUtc(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);

  const offsetAt = (timestamp) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timestamp));
    const get = (type) => Number(parts.find((part) => part.type === type)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - timestamp;
  };

  let utc = target - offsetAt(target);
  utc = target - offsetAt(utc);
  const result = new Date(utc);
  return {
    date: result.toISOString().slice(0, 10),
    time: `${result.toISOString().slice(11, 16)}:00`,
  };
}

function parseColumnOptions(columns = []) {
  return Object.fromEntries(
    columns.map((column) => {
      const settings = column.settings || {};
      const rawLabels = Array.isArray(settings.labels)
        ? settings.labels
        : Object.entries(settings.labels || {}).map(([id, label]) => ({ id, label }));
      return [
        column.id,
        rawLabels
          .map((option) => option.label ?? option.name ?? "")
          .filter(Boolean),
      ];
    })
  );
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
            columns(ids: [
              "${COLUMNS.responsible}",
              "${COLUMNS.status}",
              "${COLUMNS.type}"
            ]) {
              id
              settings
            }
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
          notes: column(COLUMNS.notes)?.text || "",
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
        columnOptions: parseColumnOptions(
          first.data?.boards?.[0]?.columns || []
        ),
      });
    }

    if (req.method === "POST") {
      const {
        action,
        startDate,
        startTime,
        endDate,
        endTime,
        responsible,
        status,
        departure,
        arrival,
        type,
        notes,
      } = req.body || {};
      if (!action?.trim() || !startDate || !startTime) {
        return res.status(400).json({
          error: "L'action, la date et l'heure de début sont requises.",
        });
      }

      const values = {
        [COLUMNS.start]: torontoDateTimeToUtc(startDate, startTime),
        [COLUMNS.departure]: departure || "",
        [COLUMNS.arrival]: arrival || "",
        [COLUMNS.notes]: notes || "",
      };
      if (endDate && endTime) {
        values[COLUMNS.end] = torontoDateTimeToUtc(endDate, endTime);
      }
      if (responsible) {
        values[COLUMNS.responsible] = {
          labels: responsible.split(",").map((label) => label.trim()).filter(Boolean),
        };
      }
      if (status) values[COLUMNS.status] = { label: status };
      if (type) values[COLUMNS.type] = { label: type };

      const created = await mondayRequest(`
        mutation {
          create_item(
            board_id: ${BOARD_ID}
            item_name: ${JSON.stringify(action.trim())}
            column_values: ${JSON.stringify(JSON.stringify(values))}
          ) { id }
        }
      `);
      return res.status(201).json({
        success: true,
        itemId: created.data?.create_item?.id,
      });
    }

    if (req.method === "PUT") {
      const {
        itemId,
        action,
        startDate,
        startTime,
        endDate,
        endTime,
        responsible,
        status,
        departure,
        arrival,
        type,
        notes,
        expectedUpdatedAt,
      } = req.body || {};
      if (!itemId) {
        return res.status(400).json({ error: "Item requis." });
      }
      const currentData = await mondayRequest(`
        query {
          items(ids: [${Number(itemId)}]) {
            id
            updated_at
          }
        }
      `);
      const currentItem = currentData.data?.items?.[0];
      if (!currentItem) {
        return res.status(404).json({ error: "Action introuvable dans Monday." });
      }
      if (expectedUpdatedAt && currentItem.updated_at !== expectedUpdatedAt) {
        return res.status(409).json({
          error: "Cette action a été modifiée par une autre personne. La logistique a été actualisée; veuillez refaire votre changement.",
          conflict: true,
        });
      }
      const values = {};

      if (action !== undefined) values.name = action.trim();
      if (status !== undefined) values[COLUMNS.status] = status ? { label: status } : null;
      if (responsible !== undefined) {
        values[COLUMNS.responsible] = responsible
          ? { labels: responsible.split(",").map((label) => label.trim()).filter(Boolean) }
          : null;
      }
      if (departure !== undefined) values[COLUMNS.departure] = departure;
      if (arrival !== undefined) values[COLUMNS.arrival] = arrival;
      if (type !== undefined) values[COLUMNS.type] = type ? { label: type } : null;
      if (notes !== undefined) values[COLUMNS.notes] = notes;
      if (startDate !== undefined || startTime !== undefined) {
        if (!startDate || !startTime) {
          return res.status(400).json({ error: "La date et l'heure de début sont requises." });
        }
        values[COLUMNS.start] = torontoDateTimeToUtc(startDate, startTime);
      }
      if (endDate !== undefined || endTime !== undefined) {
        values[COLUMNS.end] = endDate && endTime
          ? torontoDateTimeToUtc(endDate, endTime)
          : null;
      }

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

    if (req.method === "DELETE") {
      const { itemId, expectedUpdatedAt } = req.body || {};
      if (!itemId) {
        return res.status(400).json({ error: "Item requis." });
      }
      const currentData = await mondayRequest(`
        query {
          items(ids: [${Number(itemId)}]) { id updated_at }
        }
      `);
      const currentItem = currentData.data?.items?.[0];
      if (!currentItem) {
        return res.status(404).json({ error: "Action introuvable dans Monday." });
      }
      if (expectedUpdatedAt && currentItem.updated_at !== expectedUpdatedAt) {
        return res.status(409).json({
          error: "Cette action a été modifiée par une autre personne. Suppression annulée.",
          conflict: true,
        });
      }
      await mondayRequest(`
        mutation { delete_item(item_id: ${Number(itemId)}) { id } }
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
