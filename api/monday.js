export default async function handler(req, res) {
try {
const BOARD\_ID = "18425508055";

```
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
 * OUTIL MONDAY
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
 * CONVERSION DES HEURES
 * ============================================================
 *
 * Notre application :
 * 09:00
 *
 * Monday :
 * 10:00
 *
 * On garde donc ton système actuel de +1 h.
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
 * RÉCUPÉRER UN ITEM PRÉCIS DEPUIS MONDAY
 * ============================================================
 *
 * Sert à vérifier que Monday a réellement enregistré
 * les changements.
 */

async function getMondayItem(itemId) {
  const query = `
    query {
      boards(ids: [${BOARD_ID}]) {
        items_page(
          query_params: {
            rules: [
              {
                column_id: "name"
                compare_value: ["${itemId}"]
                operator: any_of
              }
            ]
          }
          limit: 500
        ) {
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

  /*
   * On ne dépend pas du filtre ci-dessus pour trouver
   * l'item : on récupère directement les items du board
   * et on cherche son ID côté serveur.
   */

  const fallbackQuery = `
    query {
      boards(ids: [${BOARD_ID}]) {
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
    await mondayRequest(
      fallbackQuery
    );

  const items =
    data.data?.boards?.[0]
      ?.items_page?.items || [];

  const item = items.find(
    (item) =>
      String(item.id) ===
      String(itemId)
  );

  if (!item) {
    throw new Error(
      `Impossible de retrouver l'item ${itemId} dans Monday après la modification.`
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
   * CRÉATION DE L'ITEM
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
   * VALEURS À ENREGISTRER
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
   * MISE À JOUR DES COLONNES
   */

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

  await mondayRequest(
    updateMutation
  );

  /*
   * VÉRIFICATION DIRECTE DANS MONDAY
   */

  const savedItem =
    await getMondayItem(
      newItem.id
    );

  const savedStart =
    savedItem.column_values?.find(
      (column) =>
        column.id ===
        COLUMN_IDS.debut
    );

  const savedEnd =
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
    );

  console.log(
    "NOUVEL ITEM VÉRIFIÉ DANS MONDAY:",
    JSON.stringify(
      {
        id: savedItem.id,
        debut: savedStart,
        fin: savedEnd,
        zone: savedZone,
      },
      null,
      2
    )
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
   * Conversion App → Monday
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
   * VALEURS À ENVOYER À MONDAY
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
   * Si le popup fournit un nom,
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
    "ENVOI À MONDAY:",
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
   * MUTATION
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
   * TRÈS IMPORTANT :
   * ON RELIT MONDAY APRÈS LA MUTATION
   * ========================================================
   */

  const savedItem =
    await getMondayItem(
      itemId
    );

  const savedStart =
    savedItem.column_values?.find(
      (column) =>
        column.id ===
        COLUMN_IDS.debut
    );

  const savedEnd =
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
    );

  console.log(
    "VALEURS RÉELLEMENT PRÉSENTES DANS MONDAY:",
    JSON.stringify(
      {
        itemId,
        debut: savedStart,
        fin: savedEnd,
        zone: savedZone,
      },
      null,
      2
    )
  );

  /*
   * On vérifie que Monday contient bien
   * les valeurs qu'on vient de lui envoyer.
   */

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

  const mondayStartText =
    savedStart?.text || "";

  const mondayEndText =
    savedEnd?.text || "";

  const startMatches =
    mondayStartText.includes(
      expectedStartDate
    ) &&
    mondayStartText.includes(
      expectedStartTime
    );

  const endMatches =
    mondayEndText.includes(
      expectedEndDate
    ) &&
    mondayEndText.includes(
      expectedEndTime
    );

  /*
   * Si Monday ne contient pas les bonnes valeurs,
   * ON NE DIT PAS QUE C'EST SAUVEGARDÉ.
   */

  if (
    !startMatches ||
    !endMatches
  ) {
    console.error(
      "VÉRIFICATION MONDAY ÉCHOUÉE",
      {
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
          start:
            mondayStartText,
          end:
            mondayEndText,
        },
      }
    );

    return res.status(500).json({
      error:
        "Monday n'a pas enregistré les heures demandées.",

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
        start:
          mondayStartText,
        end:
          mondayEndText,
      },

      mondayItem:
        savedItem,
    });
  }

  /*
   * TOUT EST OK
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
```

} catch (error) {
console.error(
"ERREUR API MONDAY:",
error
);

```
return res.status(500).json({
  error:
    "Erreur serveur",
  details:
    error.message,
});
```

}
}
