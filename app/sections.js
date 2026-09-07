// Section config shared by the app, the audit harness, and the gallery.

export const SECTIONS = [
  {
    id: "concepts",
    label: "Concepts",
    dataFile: "data/concepts.json",
    eyebrow: "A Field Codex · Vol. I",
    title: "Ideas Worth Recognizing on Sight",
    sub: "A specimen catalog of the mental models, biases, and market mechanics that keep recurring across thinking, psychology, economics, and investing — each one classified, diagrammed, and stocked with field notes so you know it when you see it.",
    searchLabel: "Search the catalog",
    genreVar: { models: "g1", psychology: "g2", economics: "g3", investing: "g4" },
    hasYear: false,
    notesLabel: "Field Notes",
    mechanismLabel: "Anatomy",
    footName: "Field Codex · Vol. I",
  },
  {
    id: "acts",
    label: "Historical Acts & Policies",
    dataFile: "data/acts.json",
    eyebrow: "The Dossier · Vol. I",
    title: "100 Acts That Redrew the Map",
    sub: "A case file of the treaties, laws, corporate decisions, and policy shifts whose consequences are still being paid out today — each one dated, diagrammed, and filed with what actually happened next.",
    searchLabel: "Search the dossier",
    genreVar: { econ: "g1", war: "g2", biz: "g3", geo: "g4" },
    hasYear: true,
    notesLabel: "Aftermath",
    mechanismLabel: "Mechanism",
    footName: "The Dossier · Vol. I",
  },
];
