export default async function handler(req, res) {
  try {
    const BOARD_ID = "18425508055";

    const COLUMN_IDS = {
      activite: "text_mm5z84v8",
      jour: "dropdown_mm634c9n",
      debut: "date_mm63hcxz",
      fin: "date_mm63gzbs",
      volet: "dropdown_mm63ffn6",
      zone: "color_mm63vn4d",
      mode: "dropdown_mm63xxam",
      status: "status",
      affichage: "text_mm5zme5q",
      categorieCouleur: "color_mm63ahs6",
      notes: "text_mm5z2k1c",
    };

    /*
     * Correspondance entre les zones de l'application
     * et l'index utilisé par la colonne Zone dans Monday.
     */
    const ZONE_INDEX = {
      "Terrain synthétique": 1,
      "Asphalte": 2,
      "Zone démo": 3,
      "Zone Famille": 4,
      "Kiosques": 5,
      "Scène": 6,
      "Tente VIP": 7,
    };

    /*
     * Monday affiche/retourne les heures avec un décalage.
     *
     * Dans notre application :
     * 05:30 = 05:30
     *
     * Dans Monday :
     * 06:30 = 05:30 dans notre programmation
     *
     * Donc lorsqu'on ENVOIE une heure depuis l'application
     * vers Monday, on ajoute 1 heure.
     */
    function addOneHourToDateTime(date, time) {
      const [hours, minutes] = time
        .split(":")
        .map(Number);

      const result = new Date(
        `${date}T${String(hours).padStart(
          2,
          "0"
        )}:${String(minutes).padStart(2, "0")}:00`
      );

      result.setHours(result.getHours() + 1);

      const year = result.getFullYear();
      const month = String(
        result.getMonth() + 1
      ).padStart(2, "0");
      const day = String(
        result.getDate()
      ).padStart(2, "0");

      const newHours = String(
        result.getHours()
      ).padStart(2, "0");

      const newMinutes = String(
        result.getMinutes()
      ).padStart(2, "0");

      return {
        date: `${year}-${month}-${day}`,
        time: `${newHours}:${newMinutes}:00`,
      };
    }

    /*
     * ================================
     * GET
     * ================================
     *
     * Récupère les activités de Monday.
     */
    if (req.method === "GET") {
      const query = `
        query {
          boards(ids: [${BOARD_ID}]) {
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
            Authorization:
              process.env.MONDAY_API_TOKEN,
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
     * ================================
     * PUT
     * ================================
     *
     * Modifie :
     * - journée
     * - heure de début
     * - heure de fin
     * - zone
     *
     * Cela fonctionne autant pour :
     * - le drag & drop
     * - la modification manuelle dans le popup
     */
    if (req.method === "PUT") {
      const {
        itemId,
        startDate,
        startTime,
        endDate,
        endTime,
        zone,
      } = req.body || {};

      if (!itemId) {
        return res.status(400).json({
          error: "itemId manquant.",
        });
      }

      if (!startDate) {
        return res.status(400).json({
          error: "startDate manquant.",
        });
      }

      if (!startTime) {
        return res.status(400).json({
          error: "startTime manquant.",
        });
      }

      if (!endDate) {
        return res.status(400).json({
          error: "endDate manquant.",
        });
      }

      if (!endTime) {
        return res.status(400).json({
          error: "endTime manquant.",
        });
      }

      if (!zone) {
        return res.status(400).json({
          error: "zone manquante.",
        });
      }

      const zoneIndex = ZONE_INDEX[zone];

      if (!zoneIndex) {
        return res.status(400).json({
          error: `Zone inconnue : ${zone}`,
        });
      }

      /*
       * Conversion de l'heure de l'application
       * vers l'heure attendue par Monday.
       */
      const mondayStart =
        addOneHourToDateTime(
          startDate,
          startTime
        );

      const mondayEnd =
        addOneHourToDateTime(
          endDate,
          endTime
        );

      /*
       * Monday accepte plusieurs colonnes
       * dans une seule mutation.
       *
       * Cela évite de faire 3 ou 4 appels séparés
       * pour chaque activité.
       */
      const columnValues = {
        [COLUMN_IDS.debut]: {
          date: mondayStart.date,
          time: mondayStart.time,
        },

        [COLUMN_IDS.fin]: {
          date: mondayEnd.date,
          time: mondayEnd.time,
        },

        [COLUMN_IDS.zone]: {
          index: zoneIndex,
        },
      };

      const mutation = `
        mutation {
          change_multiple_column_values(
            item_id: ${Number(itemId)},
            board_id: ${Number(BOARD_ID)},
            column_values: ${JSON.stringify(
              JSON.stringify(columnValues)
            )}
          ) {
            id
          }
        }
      `;

      const response = await fetch(
        "https://api.monday.com/v2",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization:
              process.env.MONDAY_API_TOKEN,
          },

          body: JSON.stringify({
            query: mutation,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.errors) {
        console.error(
          "Erreur mutation Monday:",
          data
        );

        return res.status(500).json({
          error:
            "Erreur lors de la modification dans Monday.",
          details:
            data.errors || data,
        });
      }

      return res.status(200).json({
        success: true,
        itemId,
        startDate,
        startTime,
        endDate,
        endTime,
        zone,
        mondayStart,
        mondayEnd,
        data,
      });
    }

    /*
     * Méthode HTTP non supportée.
     */
    return res.status(405).json({
      error: "Méthode non supportée.",
    });
  } catch (error) {
    console.error(
      "Erreur API Monday:",
      error
    );

    return res.status(500).json({
      error: "Erreur serveur",
      details: error.message,
    });
  }
}
