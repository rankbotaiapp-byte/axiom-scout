export const REGIONS = [
  {
    id: "jackson-josephine",
    label: "Jackson + Josephine County, OR",
    state: "OR",
    counties: ["Jackson", "Josephine"],
    clusters: [
      {
        id: "grants-pass",
        label: "Grants Pass / north Josephine",
        county: "Josephine",
        towns: ["Grants Pass", "Merlin", "Hugo", "Wilderville", "Murphy", "New Hope", "Redwood", "Wolf Creek"],
      },
      {
        id: "illinois-valley",
        label: "Illinois Valley",
        county: "Josephine",
        towns: ["Cave Junction", "Kerby", "Selma", "O'Brien", "Williams", "Takilma"],
      },
      {
        id: "medford-metro",
        label: "Medford metro",
        county: "Jackson",
        towns: ["Medford", "Central Point", "White City", "Phoenix", "Talent", "Jacksonville", "Gold Hill", "Rogue River"],
      },
      {
        id: "east-jackson",
        label: "Ashland / north Jackson",
        county: "Jackson",
        towns: ["Ashland", "Eagle Point", "Shady Cove", "Butte Falls", "Prospect", "Trail", "Applegate"],
      },
    ],
  },
  {
    id: "josephine",
    label: "Josephine County, OR",
    state: "OR",
    counties: ["Josephine"],
    clusters: [
      {
        id: "grants-pass",
        label: "Grants Pass / north Josephine",
        county: "Josephine",
        towns: ["Grants Pass", "Merlin", "Hugo", "Wilderville", "Murphy", "New Hope", "Redwood", "Wolf Creek"],
      },
      {
        id: "illinois-valley",
        label: "Illinois Valley",
        county: "Josephine",
        towns: ["Cave Junction", "Kerby", "Selma", "O'Brien", "Williams", "Takilma"],
      },
    ],
  },
  {
    id: "jackson",
    label: "Jackson County, OR",
    state: "OR",
    counties: ["Jackson"],
    clusters: [
      {
        id: "medford-metro",
        label: "Medford metro",
        county: "Jackson",
        towns: ["Medford", "Central Point", "White City", "Phoenix", "Talent", "Jacksonville", "Gold Hill", "Rogue River"],
      },
      {
        id: "east-jackson",
        label: "Ashland / north Jackson",
        county: "Jackson",
        towns: ["Ashland", "Eagle Point", "Shady Cove", "Butte Falls", "Prospect", "Trail", "Applegate"],
      },
    ],
  },
];

export const DEFAULT_REGION = "jackson-josephine";

export function getRegion(id) {
  return REGIONS.find((r) => r.id === id) || null;
}

export function allTowns(region) {
  return region.clusters.flatMap((c) => c.towns);
}
