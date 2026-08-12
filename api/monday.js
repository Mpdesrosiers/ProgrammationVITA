import { requireSession } from "./auth/_shared.js";

export default async function handler(req, res) {
  const session = requireSession(
    req,
    res,
    req.method !== "GET"
  );

  if (!session) return;

  try {
    const BOARD_ID = "18425508055";

    const COLUMN_IDS = {
      activite: "text_mm5z84v8",
      jour: "dropdown_mm634c9n",
      debut: "date_mm63hcxz",
      fin: "date_mm63gzbs",
      volet: "dropdown_mm63ffn6",
      zone: "color_mm63vn4d",
      status: "status",
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
     * CONVERSION APP → MONDAY
     * ============================================================
     *
     * Dans l'application :
     * 09:00
     *
     * Dans Monday (UTC) :
     * 13:00
     *
     * Monday affiche ensuite cette valeur UTC dans le fuseau local.
     */

    function addFourHoursToDateTime(date, time) {
      const [hours, minutes] = time
        .split(":")
        .map(Number);

      let totalMinutes =
        hours * 60 + minutes + 240;

      let newDate = date;

      if (totalMinutes >= 1440) {
        totalMinutes -= 1440;

        const dateObject = new Date(
          `${date}T00:00:00`
        );

        dateObject.setDate(
          dateObject.getDate() + 1
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
          `${String(newMinutes).padStart(2, "0")}:00`,
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
      const itemFields = `
        id
        name
        updated_at

        column_values {
          id
          text
          value
        }
      `;

      const firstPageQuery = `
        query {
          boards(ids: [${BOARD_ID}]) {
            items_page(limit: 500) {
              cursor
              items {
                ${itemFields}
              }
            }
          }
        }
      `;

      const firstPageData =
        await mondayRequest(
          firstPageQuery
        );

      const firstPage =
        firstPageData.data?.boards?.[0]
          ?.items_page;

      const allItems = [
        ...(firstPage?.items || []),
      ];

      let cursor =
        firstPage?.cursor || null;

      const visitedCursors =
        new Set();

      while (
        cursor &&
        !visitedCursors.has(cursor)
      ) {
        visitedCursors.add(cursor);

        const nextPageQuery = `
          query {
            next_items_page(
              limit: 500
              cursor: ${JSON.stringify(
                cursor
              )}
            ) {
              cursor
              items {
                ${itemFields}
              }
            }
          }
        `;

        const nextPageData =
          await mondayRequest(
            nextPageQuery
          );

        const nextPage =
          nextPageData.data
            ?.next_items_page;

        allItems.push(
          ...(nextPage?.items || [])
        );

        cursor =
          nextPage?.cursor || null;
      }

      return allItems;
    }

    async function getMondayColumnOptions() {
      const query = `
        query {
          boards(ids: [${BOARD_ID}]) {
            columns(ids: [
              "${COLUMN_IDS.volet}",
              "${COLUMN_IDS.status}",
              "${COLUMN_IDS.categorieCouleur}"
            ]) {
              id
              title
              type
              settings
            }
          }
        }
      `;

      const data =
        await mondayRequest(query);

      const columns =
        data.data?.boards?.[0]
          ?.columns || [];

      return Object.fromEntries(
        columns.map((column) => {
          const settings =
            column.settings || {};

          const rawLabels =
            Array.isArray(settings.labels)
              ? settings.labels
              : Object.entries(
                  settings.labels || {}
                ).map(([id, label]) => ({
                  id,
                  label,
                }));

          const options =
            rawLabels
              .map((option) => ({
                id:
                  option.id ??
                  option.index ??
                  option.label,
                label:
                  option.label ??
                  option.name ??
                  "",
                color:
                  option.color || "",
              }))
              .filter(
                (option) =>
                  option.label
              );

          return [
            column.id,
            {
              title: column.title,
              type: column.type,
              options,
            },
          ];
        })
      );
    }

    /*
     * ============================================================
     * RÉCUPÉRER UN ITEM
     * ============================================================
     */

    async function getMondayItem(itemId) {
      const query = `
        query {
          items(ids: [${Number(itemId)}]) {
            id
            name
            updated_at
            column_values {
              id
              text
              value
            }
          }
        }
      `;

      const data =
        await mondayRequest(query);

      const item =
        data.data?.items?.[0];

      if (!item) {
        throw new Error(
          `Impossible de retrouver l'activité ${itemId} dans Monday.`
        );
      }

      return item;
    }

    async function waitForMonday() {
      await new Promise(
        (resolve) =>
          setTimeout(resolve, 500)
      );
    }

    /*
     * ============================================================
     * GET
     * ============================================================
     */

    if (req.method === "GET") {
      const [
        items,
        columnOptions,
      ] = await Promise.all([
        getAllMondayItems(),
        getMondayColumnOptions(),
      ]);

      return res.status(200).json({
        data: {
          boards: [
            {
              id: BOARD_ID,
              items_page: {
                items,
              },
              columnOptions,
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
        jour,
        volet,
        zone,
        status,
        categorieCouleur,
        notes,
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
        addFourHoursToDateTime(
          startDate,
          startTime
        );

      const mondayEnd =
        addFourHoursToDateTime(
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

      const coreColumnValues = {
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
          label: zone,
        },
      };

      async function updateCreatedItem(
        values,
        fieldName
      ) {
        const mutation = `
          mutation {
            change_multiple_column_values(
              item_id: ${Number(newItem.id)}
              board_id: ${Number(BOARD_ID)}
              column_values: ${JSON.stringify(
                JSON.stringify(values)
              )}
            ) {
              id
            }
          }
        `;

        try {
          const result =
            await mondayRequest(mutation);

          if (
            !result.data
              ?.change_multiple_column_values
              ?.id
          ) {
            throw new Error(
              "Monday n'a pas confirmé la modification."
            );
          }
        } catch (error) {
          throw new Error(
            `Colonne « ${fieldName} » : ${error.message}`
          );
        }
      }

      await updateCreatedItem(
        coreColumnValues,
        "informations principales"
      );

      const optionalFields = [
        [
          "Journée",
          COLUMN_IDS.jour,
          jour?.trim()
            ? { labels: [jour.trim()] }
            : null,
        ],
        [
          "Volet",
          COLUMN_IDS.volet,
          volet?.trim()
            ? { labels: [volet.trim()] }
            : null,
        ],
        [
          "Statut",
          COLUMN_IDS.status,
          status?.trim()
            ? { label: status.trim() }
            : null,
        ],
        [
          "Catégorie couleur",
          COLUMN_IDS.categorieCouleur,
          categorieCouleur?.trim()
            ? {
                label:
                  categorieCouleur.trim(),
              }
            : null,
        ],
        [
          "Notes",
          COLUMN_IDS.notes,
          notes?.trim() || null,
        ],
      ];

      for (const [
        fieldName,
        columnId,
        value,
      ] of optionalFields) {
        if (value === null) continue;

        await updateCreatedItem(
          {
            [columnId]: value,
          },
          fieldName
        );
      }

      /*
       * Relire directement l'item après propagation.
       */

      await waitForMonday();

      const savedItem =
        await getMondayItem(
          newItem.id
        );

      const savedActivity =
        savedItem.column_values?.find(
          (column) =>
            column.id ===
            COLUMN_IDS.activite
        )?.text || "";

      const savedZone =
        savedItem.column_values?.find(
          (column) =>
            column.id ===
            COLUMN_IDS.zone
        )?.text || "";

      const savedStart =
        parseMondayDateValue(
          savedItem.column_values?.find(
            (column) =>
              column.id ===
              COLUMN_IDS.debut
          )
        );

      const savedEnd =
        parseMondayDateValue(
          savedItem.column_values?.find(
            (column) =>
              column.id ===
              COLUMN_IDS.fin
          )
        );

      const creationMatches =
        savedActivity === activite.trim() &&
        savedZone === zone &&
        savedStart?.date === mondayStart.date &&
        savedStart?.time?.substring(0, 5) ===
          mondayStart.time.substring(0, 5) &&
        savedEnd?.date === mondayEnd.date &&
        savedEnd?.time?.substring(0, 5) ===
          mondayEnd.time.substring(0, 5);

      if (!creationMatches) {
        return res.status(500).json({
          error:
            "Monday a répondu, mais n'a pas enregistré toutes les valeurs de la nouvelle activité.",
          expected: {
            activite: activite.trim(),
            zone,
            start: mondayStart,
            end: mondayEnd,
          },
          actual: {
            activite: savedActivity,
            zone: savedZone,
            start: savedStart,
            end: savedEnd,
          },
          mondayItem: savedItem,
        });
      }

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
        expectedUpdatedAt,
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

      if (
        expectedUpdatedAt &&
        existingItem.updated_at !==
          expectedUpdatedAt
      ) {
        return res.status(409).json({
          error:
            "Cette activité a été modifiée par une autre personne. Le calendrier a été actualisé; veuillez refaire votre changement.",
          conflict: true,
          mondayItem: existingItem,
        });
      }

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
        addFourHoursToDateTime(
          startDate,
          startTime
        );

      const mondayEnd =
        addFourHoursToDateTime(
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
          label: zone,
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

      await waitForMonday();

      let savedItem =
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

      const savedZone =
        savedItem.column_values?.find(
          (column) =>
            column.id ===
            COLUMN_IDS.zone
        )?.text || "";

      const savedActivity =
        savedItem.column_values?.find(
          (column) =>
            column.id ===
            COLUMN_IDS.activite
        )?.text || "";

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

      const zoneMatches =
        savedZone === zone;

      const activityMatches =
        typeof activite !== "string" ||
        !activite.trim() ||
        savedActivity === activite.trim();

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
              zone: savedZone,
              activite: savedActivity,
            },

            matches: {
              start: startMatches,
              end: endMatches,
              zone: zoneMatches,
              activite: activityMatches,
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
        !endMatches ||
        !zoneMatches ||
        !activityMatches
      ) {
        return res.status(500).json({
          error:
            "Monday n'a pas enregistré toutes les modifications demandées.",

          expected: {
            activite:
              typeof activite === "string"
                ? activite.trim()
                : undefined,
            zone,
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
            activite: savedActivity,
            zone: savedZone,
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
       * Vérifier une seconde fois que Monday conserve
       * réellement les valeurs avant d'annoncer le succès.
       */

      await waitForMonday();

      savedItem =
        await getMondayItem(
          itemId
        );

      const stableStart =
        parseMondayDateValue(
          savedItem.column_values?.find(
            (column) =>
              column.id ===
              COLUMN_IDS.debut
          )
        );

      const stableEnd =
        parseMondayDateValue(
          savedItem.column_values?.find(
            (column) =>
              column.id ===
              COLUMN_IDS.fin
          )
        );

      const stableZone =
        savedItem.column_values?.find(
          (column) =>
            column.id ===
            COLUMN_IDS.zone
        )?.text || "";

      const stableActivity =
        savedItem.column_values?.find(
          (column) =>
            column.id ===
            COLUMN_IDS.activite
        )?.text || "";

      const valuesAreStable =
        stableStart?.date === expectedStartDate &&
        stableStart?.time?.substring(0, 5) ===
          expectedStartTime &&
        stableEnd?.date === expectedEndDate &&
        stableEnd?.time?.substring(0, 5) ===
          expectedEndTime &&
        stableZone === zone &&
        (
          typeof activite !== "string" ||
          !activite.trim() ||
          stableActivity === activite.trim()
        );

      if (!valuesAreStable) {
        return res.status(409).json({
          error:
            "Monday a d'abord accepté la modification, puis a rétabli d'anciennes valeurs.",
          expected: {
            activite:
              typeof activite === "string"
                ? activite.trim()
                : undefined,
            zone,
            startDate: expectedStartDate,
            startTime: expectedStartTime,
            endDate: expectedEndDate,
            endTime: expectedEndTime,
          },
          actual: {
            activite: stableActivity,
            zone: stableZone,
            start: stableStart,
            end: stableEnd,
          },
          mondayItem: savedItem,
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
     * DELETE — SUPPRIMER UNE ACTIVITÉ
     * ============================================================
     */

    if (req.method === "DELETE") {
      const { itemId } =
        req.body || {};

      if (!itemId) {
        return res.status(400).json({
          error: "itemId manquant.",
        });
      }

      await getMondayItem(itemId);

      const mutation = `
        mutation {
          delete_item(
            item_id: ${Number(itemId)}
          ) {
            id
          }
        }
      `;

      const data =
        await mondayRequest(mutation);

      const deletedId =
        data.data?.delete_item?.id;

      if (
        String(deletedId) !==
        String(itemId)
      ) {
        throw new Error(
          "Monday n'a pas confirmé la suppression."
        );
      }

      return res.status(200).json({
        success: true,
        deletedItemId: deletedId,
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
