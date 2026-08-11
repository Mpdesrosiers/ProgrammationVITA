```jsx
import React, { useState } from "react";

const DAYS = ["Jeudi", "Vendredi", "Samedi", "Dimanche"];

const ZONES = [
  "Terrain synthétique",
  "Asphalte",
  "Zone démo",
  "Zone Famille",
  "Kiosques",
  "Scène",
  "Tente VIP"
];

const COLORS = {
  "Terrain synthétique": "#00c875",
  "Asphalte": "#df2f4a",
  "Zone démo": "#007eb5",
  "Zone Famille": "#9d50dd",
  "Kiosques": "#fdab3d",
  "Scène": "#8580d9",
  "Tente VIP": "#7f7f86"
};

const TIMES = [
  "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "08:30", "09:00", "09:30", "10:00",
  "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00",
  "20:30", "21:00", "21:30", "22:00", "22:30",
  "23:00", "23:30"
];

const TEST_ACTIVITIES = [
  {
    id: 1,
    name: "Activité sportive",
    zone: "Terrain synthétique",
    start: "09:00",
    end: "10:30",
    day: "Vendredi"
  },
  {
    id: 2,
    name: "Démonstration",
    zone: "Zone démo",
    start: "10:00",
    end: "11:30",
    day: "Vendredi"
  },
  {
    id: 3,
    name: "Animation famille",
    zone: "Zone Famille",
    start: "11:00",
    end: "12:30",
    day: "Samedi"
  },
  {
    id: 4,
    name: "Kiosques partenaires",
    zone: "Kiosques",
    start: "09:00",
    end: "17:00",
    day: "Samedi"
  }
];

function minutes(time) {
  var parts = time.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function App() {
  const [selectedDay, setSelectedDay] = useState("Jeudi");
  const [activities, setActivities] = useState(TEST_ACTIVITIES);
  const [selectedActivity, setSelectedActivity] = useState(null);

  function addActivity() {
    var activity = {
      id: Date.now(),
      name: "Nouvelle activité",
      zone: "Terrain synthétique",
      start: "09:00",
      end: "10:00",
      day: selectedDay
    };

    setActivities(function(current) {
      return current.concat(activity);
    });

    setSelectedActivity(activity);
  }

  function updateActivity(field, value) {
    if (!selectedActivity) {
      return;
    }

    var updated = {
      ...selectedActivity,
      [field]: value
    };

    setSelectedActivity(updated);

    setActivities(function(current) {
      return current.map(function(activity) {
        if (activity.id === updated.id) {
          return updated;
        }

        return activity;
      });
    });
  }

  function deleteActivity() {
    if (!selectedActivity) {
      return;
    }

    setActivities(function(current) {
      return current.filter(function(activity) {
        return activity.id !== selectedActivity.id;
      });
    });

    setSelectedActivity(null);
  }

  function activityPosition(activity) {
    var first = minutes("05:30");
    var start = minutes(activity.start);
    var end = minutes(activity.end);

    var top = ((start - first) / 30) * 56;
    var height = ((end - start) / 30) * 56;

    return {
      top: top + 4,
      height: Math.max(height - 8, 32)
    };
  }

  return (
    <div className="min-h-screen bg-[#151619] text-[#ebebed]">

      <header className="border-b border-[#303137] bg-[#1b1c20]">
        <div className="mx-auto max-w-[1900px] px-6 py-5">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>
              <div className="text-sm font-semibold tracking-wide text-[#8580d9]">
                FESTIVAL VITA 2026
              </div>

              <h1 className="mt-1 text-2xl font-semibold">
                Programmation
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">

              {DAYS.map(function(day) {
                var active = selectedDay === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={function() {
                      setSelectedDay(day);
                      setSelectedActivity(null);
                    }}
                    className={
                      "rounded-md px-5 py-2 text-sm font-semibold " +
                      (active
                        ? "bg-[#8580d9] text-[#151619]"
                        : "bg-[#303137] text-[#ebebed]")
                    }
                  >
                    {day}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={addActivity}
                className="ml-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#151619]"
              >
                + Ajouter
              </button>

            </div>
          </div>
        </div>
      </header>

      <main className="overflow-x-auto p-6">

        <div
          className="mx-auto grid min-w-[1450px] max-w-[1900px]"
          style={{
            gridTemplateColumns: "80px repeat(7, minmax(185px, 1fr))"
          }}
        >

          <div className="border-b border-r border-[#303137] bg-[#151619]" />

          {ZONES.map(function(zone) {
            return (
              <div
                key={zone}
                className="border-b border-r border-[#303137] bg-[#1b1c20] px-3 py-4 text-center"
              >
                <div
                  className="mx-auto mb-2 h-1 w-10 rounded-full"
                  style={{
                    backgroundColor: COLORS[zone]
                  }}
                />

                <div className="text-sm font-semibold">
                  {zone}
                </div>
              </div>
            );
          })}

          {TIMES.map(function(time) {
            return (
              <React.Fragment key={time}>

                <div className="flex h-14 items-center justify-end border-b border-r border-[#303137] bg-[#151619] px-3 text-xs text-[#8f9098]">
                  {time}
                </div>

                {ZONES.map(function(zone) {

                  var zoneActivities = activities.filter(function(activity) {
                    return (
                      activity.day === selectedDay &&
                      activity.zone === zone &&
                      activity.start === time
                    );
                  });

                  return (
                    <div
                      key={time + "-" + zone}
                      className="relative h-14 border-b border-r border-[#303137] bg-[#151619]"
                    >

                      {zoneActivities.map(function(activity) {

                        var position = activityPosition(activity);

                        return (
                          <button
                            key={activity.id}
                            type="button"
                            onClick={function() {
                              setSelectedActivity(activity);
                            }}
                            className="absolute left-1 right-1 z-20 overflow-hidden rounded-md p-2 text-left text-xs shadow-lg"
                            style={{
                              top: position.top,
                              height: position.height,
                              backgroundColor: COLORS[activity.zone],
                              color: "#151619"
                            }}
                          >
                            <div className="font-semibold">
                              {activity.name}
                            </div>

                            <div className="mt-1 text-[11px] opacity-80">
                              {activity.start} - {activity.end}
                            </div>
                          </button>
                        );
                      })}

                    </div>
                  );
                })}

              </React.Fragment>
            );
          })}

        </div>
      </main>

      {selectedActivity && (
        <div className="fixed right-0 top-0 z-50 h-full w-[380px] border-l border-[#303137] bg-[#1b1c20] p-6 shadow-2xl">

          <div className="flex items-center justify-between">

            <h2 className="text-lg font-semibold">
              Modifier l'activité
            </h2>

            <button
              type="button"
              onClick={function() {
                setSelectedActivity(null);
              }}
              className="text-2xl text-[#a1a1a8]"
            >
              ×
            </button>

          </div>

          <div className="mt-6 space-y-5">

            <label className="block">
              <div className="mb-2 text-xs text-[#a1a1a8]">
                Nom
              </div>

              <input
                value={selectedActivity.name}
                onChange={function(event) {
                  updateActivity("name", event.target.value);
                }}
                className="w-full rounded-md border border-[#3c3d43] bg-[#151619] px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-xs text-[#a1a1a8]">
                Zone
              </div>

              <select
                value={selectedActivity.zone}
                onChange={function(event) {
                  updateActivity("zone", event.target.value);
                }}
                className="w-full rounded-md border border-[#3c3d43] bg-[#151619] px-3 py-2 text-sm"
              >
                {ZONES.map(function(zone) {
                  return (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  );
                })}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">

              <label>
                <div className="mb-2 text-xs text-[#a1a1a8]">
                  Début
                </div>

                <input
                  type="time"
                  value={selectedActivity.start}
                  onChange={function(event) {
                    updateActivity("start", event.target.value);
                  }}
                  className="w-full rounded-md border border-[#3c3d43] bg-[#151619] px-3 py-2 text-sm"
                />
              </label>

              <label>
                <div className="mb-2 text-xs text-[#a1a1a8]">
                  Fin
                </div>

                <input
                  type="time"
                  value={selectedActivity.end}
                  onChange={function(event) {
                    updateActivity("end", event.target.value);
                  }}
                  className="w-full rounded-md border border-[#3c3d43] bg-[#151619] px-3 py-2 text-sm"
                />
              </label>

            </div>

            <label className="block">
              <div className="mb-2 text-xs text-[#a1a1a8]">
                Jour
              </div>

              <select
                value={selectedActivity.day}
                onChange={function(event) {
                  updateActivity("day", event.target.value);
                }}
                className="w-full rounded-md border border-[#3c3d43] bg-[#151619] px-3 py-2 text-sm"
              >
                {DAYS.map(function(day) {
                  return (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  );
                })}
              </select>
            </label>

            <button
              type="button"
              onClick={deleteActivity}
              className="w-full rounded-md border border-[#df2f4a] px-4 py-2 text-sm font-semibold text-[#df2f4a]"
            >
              Supprimer
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
```
