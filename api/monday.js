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
     * ============================================================
     * REQUÊTE MONDAY
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

      const data = await response.json();

      console.log(
        "Réponse Monday:",
        JSON.stringify(data, null, 2)
      );

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP Monday: ${response.status}`
        );
      }

      if (data.errors) {
        throw new Error(
          data.errors
            .map((error) => error.message)
            .join(" | ")
        );
      }

      return data;
    }

    /*
     * ============================================================
     * HEURES APP → MONDAY SANS DÉCALAGE
     * ============================================================
     *
     * Dans l'application :
     * 09:00
     *
     * Dans Monday :
     * 10:00
     *
     * On conserve donc ton système actuel de +1 heure.
     */

    function toMondayDateTime(date, time) {
      return {
        date,
        time: `${time}:00`,
      };
    }

    /*
     * ============================================================
     * CONVERSION MONDAY → APP
     * ============================================================
     *
     * IMPORTANT :
     * On lit "value" de la colonne Date plutôt que "text".
     *
     * Cela évite les problèmes de formatage de Monday.
     */

    function parseMondayDateValue(column) {
      if (!column) {
        return null;
      }

      if (!column.value) {
        return null;
      }

      try {
        const parsed =
          JSON.parse(column.value);

        if (!parsed.date) {
          return null;
        }

        return {
          date: parsed.date,
          time:
            parsed.time ||
            "00:00:00",
        };
      } catch (error) {
        console.error(
          "Impossible de parser la valeur Monday:",
          column.value
        );

        return null;
      }
    }

    /*
     * Retire 1 heure à une valeur Monday
     * pour revenir à l'heure de l'application.
     */

    function subtractOneHourFromMonday(
      date,
      time
    ) {
      const [hours, minutes] = time
        .substring(0, 5)
        .split(":")
        .map(Number);

      let totalMinutes =
        hours * 60 + minutes - 60;

      let newDate = date;

      if (totalMinutes < 0) {
        totalMinutes += 1440;

        const dateObject = new Date(
          `${date}T00:00:00`
        );

        dateObject.setDate(
          dateObject.getDate() - 1
        );

        newDate =
          dateObject
            .toISOString()
            .slice(0, 10);
      }

      const newHours = Math.floor(
        totalMinutes / 60
      );

      const newMinutes =
        totalMinutes % 60;

      return {
        date: newDate,
        time:
          `${String(newHours).padStart(2, "0")}:` +
          `${String(newMinutes).padStart(2, "0")}`,
      };
    }

    /*
     * ============================================================
     * RÉCUPÉRER TOUS LES ITEMS
     * ============================================================
     */

    async function getAllMondayItems() {
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

      return (
        data.data?.boards?.[0]
          ?.items_page?.items || []
      );
    }

    /*
     * ============================================================
     * RÉCUPÉRER UN ITEM
     * ============================================================
     */

    async function getMondayItem(itemId) {
      const items =
        await getAllMondayItems();

      const item = items.find(
        (currentItem) =>
          String(currentItem.id) ===
          String(itemId)
      );

      if (!item) {
        throw new Error(
          `Impossible de retrouver l'activité ${itemId} dans Monday.`
        );
      }

      return item;
    }

    /*
     * ============================================================
     * GET
     * ============================================================
     */

    if (req.method === "GET") {
      const items =
        await getAllMondayItems();

      return res.status(200).json({
        data: {
          boards: [
            {
              id: BOARD_ID,
              items_page: {
                items,
              },
            },
          ],
        },
      });
    }

    /*
     * ============================================================
     * POST — CRÉER UNE ACTIVITÉ
     * ============================================================
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

      if (!activite?.trim()) {
        return res.status(400).json({
          error:
            "Le nom de l'activité est manquant.",
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

      const zoneIndex =
        ZONE_INDEX[zone];

      if (!zoneIndex) {
        return res.status(400).json({
          error:
            `Zone inconnue : ${zone}`,
        });
      }

      const mondayStart =
        toMondayDateTime(
          startDate,
          startTime
        );

      const mondayEnd =
        toMondayDateTime(
          endDate,
          endTime
        );

      /*
       * Créer l'item.
       */

      const createMutation = `
        mutation {
          create_item(
            board_id: ${Number(
              BOARD_ID
            )}
            item_name: ${JSON.stringify(
              activite.trim()
            )}
          ) {
            id
            name
          }
        }
      `;

      const createData =
        await mondayRequest(
          createMutation
        );

      const newItem =
        createData.data?.create_item;

      if (!newItem?.id) {
        throw new Error(
          "Monday n'a pas retourné l'ID du nouvel item."
        );
      }

      /*
       * Ajouter les informations.
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

      const updateMutation = `
        mutation {
          change_multiple_column_values(
            item_id: ${Number(
              newItem.id
            )}
            board_id: ${Number(
              BOARD_ID
            )}
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

      const updateData =
        await mondayRequest(
          updateMutation
        );

      if (
        !updateData.data
          ?.change_multiple_column_values
          ?.id
      ) {
        throw new Error(
          "Monday n'a pas confirmé l'ajout des informations de l'activité."
        );
      }

      /*
       * Relire l'item.
       */

      const savedItem =
        await getMondayItem(
          newItem.id
        );

      return res.status(200).json({
        success: true,
        verified: true,
        itemId: newItem.id,
        activite:
          activite.trim(),
        startDate,
        startTime,
        endDate,
        endTime,
        zone,
        mondayStart,
        mondayEnd,
        mondayItem:
          savedItem,
      });
    }

    /*
     * ============================================================
     * PUT — MODIFIER UNE ACTIVITÉ
     * ============================================================
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
       * Vérifier que l'item existe réellement.
       */

      const existingItem =
        await getMondayItem(
          itemId
        );

      if (!existingItem) {
        return res.status(404).json({
          error:
            "Activité introuvable dans Monday.",
        });
      }

      /*
       * Conversion App → Monday
       */

      const mondayStart =
        toMondayDateTime(
          startDate,
          startTime
        );

      const mondayEnd =
        toMondayDateTime(
          endDate,
          endTime
        );

      /*
       * Valeurs à envoyer.
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
       * Si un nom est fourni,
       * on le modifie également.
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

      console.log(
        "MODIFICATION MONDAY",
        JSON.stringify(
          {
            itemId,
            columnValues,
          },
          null,
          2
        )
      );

      /*
       * Mutation Monday.
       */

      const mutation = `
        mutation {
          change_multiple_column_values(
            item_id: ${Number(
              itemId
            )}
            board_id: ${Number(
              BOARD_ID
            )}
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

      const mutationData =
        await mondayRequest(
          mutation
        );

      const mutationItem =
        mutationData.data
          ?.change_multiple_column_values;

      if (!mutationItem?.id) {
        throw new Error(
          "Monday n'a pas confirmé la modification."
        );
      }

      /*
       * ========================================================
       * RELIRE MONDAY
       * ========================================================
       */

      const savedItem =
        await getMondayItem(
          itemId
        );

      /*
       * Récupérer les colonnes Date.
       */

      const savedStartColumn =
        savedItem.column_values?.find(
          (column) =>
            column.id ===
            COLUMN_IDS.debut
        );

      const savedEndColumn =
        savedItem.column_values?.find(
          (column) =>
            column.id ===
            COLUMN_IDS.fin
        );

      /*
       * Lire leurs valeurs JSON.
       */

      const savedStart =
        parseMondayDateValue(
          savedStartColumn
        );

      const savedEnd =
        parseMondayDateValue(
          savedEndColumn
        );

      if (!savedStart) {
        throw new Error(
          "Monday a répondu, mais la date de début n'a pas pu être relue."
        );
      }

      if (!savedEnd) {
        throw new Error(
          "Monday a répondu, mais la date de fin n'a pas pu être relue."
        );
      }

      /*
       * Comparaison directe des valeurs
       * envoyées à Monday.
       *
       * On compare les valeurs Monday brutes,
       * donc on ne dépend plus du texte affiché.
       */

      const actualStartDate =
        savedStart.date;

      const actualStartTime =
        savedStart.time.substring(
          0,
          5
        );

      const actualEndDate =
        savedEnd.date;

      const actualEndTime =
        savedEnd.time.substring(
          0,
          5
        );

      const expectedStartDate =
        mondayStart.date;

      const expectedStartTime =
        mondayStart.time.substring(
          0,
          5
        );

      const expectedEndDate =
        mondayEnd.date;

      const expectedEndTime =
        mondayEnd.time.substring(
          0,
          5
        );

      const startMatches =
        actualStartDate ===
          expectedStartDate &&
        actualStartTime ===
          expectedStartTime;

      const endMatches =
        actualEndDate ===
          expectedEndDate &&
        actualEndTime ===
          expectedEndTime;

      console.log(
        "VÉRIFICATION FINALE MONDAY:",
        JSON.stringify(
          {
            itemId,

            expected: {
              startDate:
                expectedStartDate,
              startTime:
                expectedStartTime,
              endDate:
                expectedEndDate,
              endTime:
                expectedEndTime,
            },

            actual: {
              startDate:
                actualStartDate,
              startTime:
                actualStartTime,
              endDate:
                actualEndDate,
              endTime:
                actualEndTime,
            },
          },
          null,
          2
        )
      );

      /*
       * SI LES VALEURS NE CORRESPONDENT PAS,
       * ON RETOURNE UNE VRAIE ERREUR.
       */

      if (
        !startMatches ||
        !endMatches
      ) {
        return res.status(500).json({
          error:
            "Monday n'a pas enregistré exactement les heures demandées.",

          expected: {
            startDate:
              expectedStartDate,
            startTime:
              expectedStartTime,
            endDate:
              expectedEndDate,
            endTime:
              expectedEndTime,
          },

          actual: {
            startDate:
              actualStartDate,
            startTime:
              actualStartTime,
            endDate:
              actualEndDate,
            endTime:
              actualEndTime,
          },

          mondayItem:
            savedItem,
        });
      }

      /*
       * ========================================================
       * SUCCÈS
       * ========================================================
       */

      return res.status(200).json({
        success: true,
        verified: true,

        itemId,

        startDate,
        startTime,

        endDate,
        endTime,

        zone,

        mondayStart,
        mondayEnd,

        mondayItem:
          savedItem,
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
      "ERREUR API MONDAY:",
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
