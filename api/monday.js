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
     * ================================
     * ZONES
     * ================================
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
     * ================================
     * CONVERSION HEURE
     * ================================
     *
     * Dans notre application :
     *
     * 05:30 = 05:30
     *
     * Dans Monday :
     *
     * 06:30 = 05:30 dans notre programmation
     *
     * Donc lorsqu'on ENVOIE une heure
     * depuis l'application vers Monday,
     * on ajoute 1 heure.
     */

    function addOneHourToDateTime(
      date,
      time
    ) {
      const [hours, minutes] = time
        .split(":")
        .map(Number);

      const result = new Date(
        `${date}T${String(hours).padStart(
          2,
          "0"
        )}:${String(minutes).padStart(
          2,
          "0"
        )}:00`
      );

      result.setHours(
        result.getHours() + 1
      );

      const year =
        result.getFullYear();

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
            "Content-Type":
              "application/json",

            Authorization:
              process.env.MONDAY_API_TOKEN,
          },

          body: JSON.stringify({
            query,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.errors
      ) {
        return res.status(500).json({
          error: "Erreur Monday",
          details:
            data.errors || data,
        });
      }

      return res.status(200).json(
        data
      );
    }

    /*
     * ================================
     * POST
     * ================================
     *
     * CRÉE UNE NOUVELLE ACTIVITÉ
     * DANS MONDAY.
     *
     * Reçoit :
     *
     * - activite
     * - startDate
     * - startTime
     * - endDate
     * - endTime
     * - zone
     */

    if (req.method === "POST") {
      const {
        activite,
        startDate,
        startTime,
        endDate,
        endTime,
        zone,
      } = req.body || {};

      /*
       * VALIDATION
       */

      if (!activite) {
        return res.status(400).json({
          error:
            "Nom de l'activité manquant.",
        });
      }

      if (!startDate) {
        return res.status(400).json({
          error:
            "startDate manquant.",
        });
      }

      if (!startTime) {
        return res.status(400).json({
          error:
            "startTime manquant.",
        });
      }

      if (!endDate) {
        return res.status(400).json({
          error:
            "endDate manquant.",
        });
      }

      if (!endTime) {
        return res.status(400).json({
          error:
            "endTime manquant.",
        });
      }

      if (!zone) {
        return res.status(400).json({
          error:
            "Zone manquante.",
        });
      }

      const zoneIndex =
        ZONE_INDEX[zone];

      if (!zoneIndex) {
        return res.status(400).json({
          error: `Zone inconnue : ${zone}`,
        });
      }

      /*
       * CONVERSION DES HEURES
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
       * COLONNES DU NOUVEL ITEM
       *
       * On remplit :
       *
       * - Activité
       * - Début
       * - Fin
       * - Zone
       *
       * Les autres colonnes restent
       * vides afin que tu puisses les
       * compléter ensuite dans Monday.
       */

      const columnValues = {
        [COLUMN_IDS.activite]:
          activite,

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

      /*
       * MUTATION MONDAY
       */

      const mutation = `
        mutation {
          create_item(
            board_id: ${Number(
              BOARD_ID
            )},
            item_name: ${JSON.stringify(
              activite
            )},
            column_values: ${JSON.stringify(
              JSON.stringify(
                columnValues
              )
            )}
          ) {
            id
            name
          }
        }
      `;

      const response = await fetch(
        "https://api.monday.com/v2",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              process.env.MONDAY_API_TOKEN,
          },

          body: JSON.stringify({
            query: mutation,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.errors
      ) {
        console.error(
          "Erreur création Monday:",
          data
        );

        return res.status(500).json({
          error:
            "Erreur lors de la création de l'activité dans Monday.",
          details:
            data.errors || data,
        });
      }

      /*
       * RETOUR AU FRONTEND
       */

      return res.status(200).json({
        success: true,

        item:
          data.data?.create_item,

        activite,

        startDate,

        startTime,

        endDate,

        endTime,

        zone,

        mondayStart,

        mondayEnd,
      });
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
     * Cela fonctionne pour :
     * - drag & drop
     * - modification manuelle
     */

    if (req.method === "PUT") {
      const {
        itemId,
        startDate,
        startTime,
        endDate,
        endTime,
        zone,
        activite,
      } = req.body || {};

      if (!itemId) {
        return res.status(400).json({
          error:
            "itemId manquant.",
        });
      }

      if (!startDate) {
        return res.status(400).json({
          error:
            "startDate manquant.",
        });
      }

      if (!startTime) {
        return res.status(400).json({
          error:
            "startTime manquant.",
        });
      }

      if (!endDate) {
        return res.status(400).json({
          error:
            "endDate manquant.",
        });
      }

      if (!endTime) {
        return res.status(400).json({
          error:
            "endTime manquant.",
        });
      }

      if (!zone) {
        return res.status(400).json({
          error:
            "Zone manquante.",
        });
      }

      const zoneIndex =
        ZONE_INDEX[zone];

      if (!zoneIndex) {
        return res.status(400).json({
          error: `Zone inconnue : ${zone}`,
        });
      }

      /*
       * CONVERSION DE L'HEURE
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
       * COLONNES À MODIFIER
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

      /*
       * Si une activité est fournie,
       * on modifie également son nom
       * dans la colonne Activité.
       */

      if (activite !== undefined) {
        columnValues[
          COLUMN_IDS.activite
        ] = activite;
      }

      const mutation = `
        mutation {
          change_multiple_column_values(
            item_id: ${Number(
              itemId
            )},

            board_id: ${Number(
              BOARD_ID
            )},

            column_values: ${JSON.stringify(
              JSON.stringify(
                columnValues
              )
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
            "Content-Type":
              "application/json",

            Authorization:
              process.env.MONDAY_API_TOKEN,
          },

          body: JSON.stringify({
            query: mutation,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.errors
      ) {
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

        activite,

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
     * ================================
     * MÉTHODE NON SUPPORTÉE
     * ================================
     */

    return res.status(405).json({
      error:
        "Méthode non supportée.",
    });
  } catch (error) {
    console.error(
      "Erreur API Monday:",
      error
    );

    return res.status(500).json({
      error: "Erreur serveur",
      details:
        error.message,
    });
  }
}
