function addFourHours(date, time) {
  const [hours, minutes] = time.split(":").map(Number);

  let totalMinutes = hours * 60 + minutes + 240;

  let newDate = date;

  if (totalMinutes >= 1440) {
    totalMinutes -= 1440;

    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + 1);

    newDate = d.toISOString().split("T")[0];
  }

  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;

  return {
    date: newDate,
    time: `${String(newHours).padStart(2, "0")}:${String(
      newMinutes
    ).padStart(2, "0")}`,
  };
}

export default async function handler(req, res) {
  try {
    const token = process.env.MONDAY_API_TOKEN;

    if (!token) {
      return res.status(500).json({
        error: "MONDAY_API_TOKEN est manquant.",
      });
    }

    /*
     * ==========================================
     * GET
     * Charge les activités depuis Monday
     * ==========================================
     */

    if (req.method === "GET") {
      const query = `
        query {
          boards(ids: [18425508055]) {
            id
            name
            items_page(limit: 500) {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      const response = await fetch(
        "https://api.monday.com/v2",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            query,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.errors) {
        return res.status(500).json({
          error: "Erreur Monday",
          details: data.errors || data,
        });
      }

      return res.status(200).json(data);
    }

    /*
     * ==========================================
     * PUT
     * Modifie une activité dans Monday
     * ==========================================
     */

    if (req.method === "PUT") {
      const {
        itemId,
        startDate,
        startTime,
        endDate,
        endTime,
        zone,
      } = req.body;

      if (
        !itemId ||
        !startDate ||
        !startTime ||
        !endDate ||
        !endTime ||
        !zone
      ) {
        return res.status(400).json({
          error:
            "Données manquantes pour modifier l'activité.",
        });
      }

      /*
       * ==========================================
       * CONVERSION DES HEURES
       *
       * L'application travaille avec l'heure
       * locale de Montréal.
       *
       * Monday attend ici une valeur qui doit
       * être décalée de +4 heures.
       *
       * Exemple :
       * App     09:00
       * Monday  13:00
       *
       * Monday réaffichera alors 09:00.
       * ==========================================
       */

      const mondayStart = addFourHours(
        startDate,
        startTime
      );

      const mondayEnd = addFourHours(
        endDate,
        endTime
      );

      /*
       * ==========================================
       * MODIFICATION DE L'HEURE DE DÉBUT
       * ==========================================
       */

      const startMutation = `
        mutation {
          change_column_value(
            board_id: 18425508055,
            item_id: ${itemId},
            column_id: "date_mm63hcxz",
            value: "{\\"date\\":\\"${mondayStart.date}\\",\\"time\\":\\"${mondayStart.time}:00\\"}"
          ) {
            id
          }
        }
      `;

      const startResponse = await fetch(
        "https://api.monday.com/v2",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            query: startMutation,
          }),
        }
      );

      const startData =
        await startResponse.json();

      if (
        !startResponse.ok ||
        startData.errors
      ) {
        return res.status(500).json({
          error:
            "Impossible de modifier l'heure de début.",
          details:
            startData.errors || startData,
        });
      }

      /*
       * ==========================================
       * MODIFICATION DE L'HEURE DE FIN
       * ==========================================
       */

      const endMutation = `
        mutation {
          change_column_value(
            board_id: 18425508055,
            item_id: ${itemId},
            column_id: "date_mm63gzbs",
            value: "{\\"date\\":\\"${mondayEnd.date}\\",\\"time\\":\\"${mondayEnd.time}:00\\"}"
          ) {
            id
          }
        }
      `;

      const endResponse = await fetch(
        "https://api.monday.com/v2",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            query: endMutation,
          }),
        }
      );

      const endData =
        await endResponse.json();

      if (
        !endResponse.ok ||
        endData.errors
      ) {
        return res.status(500).json({
          error:
            "Impossible de modifier l'heure de fin.",
          details:
            endData.errors || endData,
        });
      }

      /*
       * ==========================================
       * MODIFICATION DE LA ZONE
       * ==========================================
       */

      const zoneMutation = `
        mutation {
          change_column_value(
            board_id: 18425508055,
            item_id: ${itemId},
            column_id: "color_mm63vn4d",
            value: "{\\"label\\":\\"${zone}\\"}"
          ) {
            id
          }
        }
      `;

      const zoneResponse = await fetch(
        "https://api.monday.com/v2",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },

          body: JSON.stringify({
            query: zoneMutation,
          }),
        }
      );

      const zoneData =
        await zoneResponse.json();

      if (
        !zoneResponse.ok ||
        zoneData.errors
      ) {
        return res.status(500).json({
          error:
            "Impossible de modifier la zone.",
          details:
            zoneData.errors || zoneData,
        });
      }

      /*
       * ==========================================
       * SUCCÈS
       * ==========================================
       */

      return res.status(200).json({
        success: true,

        itemId,

        app: {
          startDate,
          startTime,
          endDate,
          endTime,
          zone,
        },

        monday: {
          startDate:
            mondayStart.date,
          startTime:
            mondayStart.time,
          endDate:
            mondayEnd.date,
          endTime:
            mondayEnd.time,
          zone,
        },
      });
    }

    /*
     * ==========================================
     * AUTRES MÉTHODES
     * ==========================================
     */

    return res.status(405).json({
      error: "Méthode non autorisée.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Erreur serveur",
      details: error.message,
    });
  }
}
