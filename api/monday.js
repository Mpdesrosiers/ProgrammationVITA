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
     * et l'index utilisé dans la colonne Zone de Monday.
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
     * Monday utilise une heure qui est décalée de +1 h
     * par rapport à l'heure affichée dans notre programmation.
     *
     * Exemple :
     * App : 09:00
     * Monday : 10:00
     *
     * App : 17:00
     * Monday : 18:00
     */

    function addOneHourToDateTime(date, time) {
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
     * ============================================================
     * FONCTION : APPEL MONDAY
     * ============================================================
     */

    async function mondayRequest(query) {
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

      const data =
        await response.json();

      if (!response.ok || data.errors) {
        console.error(
          "Erreur Monday:",
          JSON.stringify(
            data,
            null,
            2
          )
        );

        throw new Error(
          data.errors?.[0]?.message ||
            "Erreur lors de la communication avec Monday."
        );
      }

      return data;
    }

    /*
     * ============================================================
     * GET
     * ============================================================
     *
     * Récupère toutes les activités de Monday.
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

      const data =
        await mondayRequest(query);

      return res.status(200).json(data);
    }

    /*
     * ============================================================
     * POST
     * ============================================================
     *
     * Crée une nouvelle activité dans Monday.
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
       * VALIDATIONS
       */

      if (!activite?.trim()) {
        return res.status(400).json({
          error:
            "Le nom de l'activité est manquant.",
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
            "zone manquante.",
        });
      }

      const zoneIndex =
        ZONE_INDEX[zone];

      if (!zoneIndex) {
        return res.status(400).json({
          error:
            `Zone inconnue : ${zone}`,
        });
      }

      /*
       * CONVERSION DES HEURES
       *
       * App 09:00 → Monday 10:00
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
       * Valeurs envoyées à Monday.
       */

      const columnValues = {
        [COLUMN_IDS.activite]:
          activite.trim(),

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
       * Création de l'item.
       *
       * IMPORTANT :
       * on utilise create_item puis on applique
       * les colonnes immédiatement après.
       */

      const createMutation = `
        mutation {
          create_item(
            board_id: ${Number(
              BOARD_ID
            )},
            item_name: ${JSON.stringify(
              activite.trim()
            )}
          ) {
            id
          }
        }
      `;

      const createData =
        await mondayRequest(
          createMutation
        );

      const newItemId =
        createData.data?.create_item?.id;

      if (!newItemId) {
        throw new Error(
          "Monday n'a pas retourné l'identifiant du nouvel item."
        );
      }

      /*
       * Ajout des colonnes au nouvel item.
       */

      const updateMutation = `
        mutation {
          change_multiple_column_values(
            item_id: ${Number(
              newItemId
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

            column_values {
              id
              text
              value
            }
          }
        }
      `;

      const updateData =
        await mondayRequest(
          updateMutation
        );

      /*
       * Vérification que Monday a bien
       * retourné l'item modifié.
       */

      if (
        !updateData.data
          ?.change_multiple_column_values
          ?.id
      ) {
        throw new Error(
          "L'activité a été créée, mais Monday n'a pas confirmé la mise à jour des colonnes."
        );
      }

      return res.status(200).json({
        success: true,

        itemId: newItemId,

        activite:
          activite.trim(),

        startDate,
        startTime,

        endDate,
        endTime,

        zone,

        mondayStart,
        mondayEnd,

        data: updateData,
      });
    }

    /*
     * ============================================================
     * PUT
     * ============================================================
     *
     * Modifie une activité existante.
     *
     * Utilisé pour :
     * - drag & drop
     * - modification dans le popup
     */

    if (req.method === "PUT") {
      const {
        itemId,
        activite,
        startDate,
        startTime,
        endDate,
        endTime,
        zone,
      } = req.body || {};

      /*
       * VALIDATIONS
       */

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
            "zone manquante.",
        });
      }

      const zoneIndex =
        ZONE_INDEX[zone];

      if (!zoneIndex) {
        return res.status(400).json({
          error:
            `Zone inconnue : ${zone}`,
        });
      }

      /*
       * CONVERSION DES HEURES
       *
       * App 09:00 → Monday 10:00
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
       * Si un nom est fourni, on modifie également
       * la colonne Activité.
       */

      if (
        typeof activite ===
          "string" &&
        activite.trim()
      ) {
        columnValues[
          COLUMN_IDS.activite
        ] = activite.trim();
      }

      /*
       * MUTATION MONDAY
       */

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

            column_values {
              id
              text
              value
            }
          }
        }
      `;

      const data =
        await mondayRequest(
          mutation
        );

      const updatedItem =
        data.data
          ?.change_multiple_column_values;

      /*
       * VÉRIFICATION IMPORTANTE
       *
       * On ne retourne "success"
       * que si Monday nous a bien
       * retourné l'item modifié.
       */

      if (!updatedItem?.id) {
        console.error(
          "Monday n'a pas confirmé la modification:",
          JSON.stringify(
            data,
            null,
            2
          )
        );

        return res.status(500).json({
          error:
            "Monday n'a pas confirmé la modification.",
          details: data,
        });
      }

      return res.status(200).json({
        success: true,

        itemId,

        activite:
          activite || null,

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
     * ============================================================
     * MÉTHODE NON SUPPORTÉE
     * ============================================================
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
      error:
        "Erreur serveur",
      details:
        error.message,
    });
  }
}
