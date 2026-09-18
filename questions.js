// The authoritative question data for the 2026 assessment.
//
// `templateText` on every row is copied verbatim from the shipped workbook at
// public/assets/The_Corporate_Supplier_Questionnaire_2026.xlsx — including its
// trailing spaces, its "e.g.," and its straight quotes. The upload parser
// matches on these strings, so they must never be tidied. The guided form uses
// `label` instead, which carries the corrected wording from spec Section 8.

export const SHEET_NAME = 'Supplier Assessment 2026'

export const TEMPLATE_HEADERS = [
  'SECTION',
  'ESRS REF',
  'TYPE',
  'QUESTION / METRIC',
  'SUPPLIER RESPONSE',
  'NOTES / EVIDENCE',
  'STATUS',
]

// The six assessment sections. "S1 — General Information & EcoVadis Bypass"
// was retired as a numbered section in v3.0: its five fields became the
// universal Company & Contact step (IDENTITY_FIELDS below), so they are asked
// once at the start of every door instead of only inside Path B.
export const SECTIONS = [
  { id: 'S2', title: 'Climate & Decarbonisation', esrs: 'ESRS E1' },
  { id: 'S3', title: 'Pollution & PFAS', esrs: 'ESRS E2' },
  { id: 'S4', title: 'Water & Marine Resources', esrs: 'ESRS E3' },
  { id: 'S5', title: 'Circular Economy & Waste', esrs: 'ESRS E5' },
  { id: 'S6', title: 'Biodiversity & Ecosystems', esrs: 'ESRS E4' },
  { id: 'S7', title: 'Social, Labour & Governance', esrs: 'ESRS S2 · G1' },
]

export const sectionById = (id) => SECTIONS.find((s) => s.id === id)

// ---------------------------------------------------------------------------
// The twenty-eight S2–S7 template rows, in the order they appear in the
// workbook.
//
// `id` is the session-state key, and is the guided form's own field id, so an
// answer typed in the guided form and an answer parsed from an upload live
// under the same key and the conditional rules in Section 9.2 apply to both
// without special-casing.
//
// The workbook still physically contains two S1 rows above these, combining
// five identity facts into two cells. As of v3.0 the parser does not read them
// at all (spec 9.1): that identity is captured by the door's Company & Contact
// step instead. They are simply absent from this list, and check 5 scans past
// them by matching on question text rather than on row position.
//
// `displaySection` is where the row belongs, not what the workbook tags it.
// Row 23 is tagged S5 in the file but is a water question — spec 9.1 defect one.
// ---------------------------------------------------------------------------
export const TEMPLATE_ROWS = [
  {
    id: 'S2-1',
    row: 9,
    displaySection: 'S2',
    displayId: 'S2-1',
    esrs: 'E1-4',
    long: true,
    templateText:
      'Total Scope 1 emissions for last fiscal year (metric tonnes CO₂e). Include verification method.',
  },
  {
    id: 'S2-2',
    row: 10,
    displaySection: 'S2',
    displayId: 'S2-2',
    esrs: 'E1-4',
    long: false,
    templateText: 'Total Scope 2 emissions for last fiscal year — market-based (metric tonnes CO₂e).',
  },
  {
    id: 'S2-3',
    row: 11,
    displaySection: 'S2',
    displayId: 'S2-3',
    esrs: 'E1-4',
    long: false,
    templateText: 'Total Scope 3 emissions for last fiscal year (metric tonnes CO₂e). ',
  },
  {
    // Defect two: this row ends at column D in the shipped file. Columns E and F
    // are absent, and the parser reads them as empty rather than a mismatch.
    id: 'S2-4',
    row: 12,
    displaySection: 'S2',
    displayId: 'S2-4',
    esrs: 'E1-4',
    long: true,
    templateText: 'Specify scope 3 categories included.',
  },
  {
    id: 'S2-5',
    row: 13,
    displaySection: 'S2',
    displayId: 'S2-5',
    esrs: 'E1-3',
    long: false,
    templateText:
      'Does your organisation have a Science-Based Target (SBTi) validated decarbonisation target?',
  },
  {
    id: 'S2-6',
    row: 14,
    displaySection: 'S2',
    displayId: 'S2-6',
    esrs: 'E1-2',
    long: true,
    templateText:
      'Describe your top three decarbonisation projects currently in progress or planned for the next 24 months. Include estimated tCO₂e reduction and the specific technology being utilised (e.g., electrification of heat, on-site renewables).',
  },
  {
    id: 'S2-7',
    row: 15,
    displaySection: 'S2',
    displayId: 'S2-7',
    esrs: 'E1-2',
    long: true,
    templateText:
      'What are the primary technical or financial barriers preventing you from reaching a 50% reduction in Scope 1 and 2 emissions by 2030?',
  },
  {
    id: 'S3-1',
    row: 17,
    displaySection: 'S3',
    displayId: 'S3-1',
    esrs: 'E2-3',
    long: false,
    templateText:
      'Total weight of substances of concern (REACH, SVHC list) used in production last fiscal year (kg).',
  },
  {
    id: 'S3-2',
    row: 18,
    displaySection: 'S3',
    displayId: 'S3-2',
    esrs: 'E2-3',
    long: false,
    templateText:
      'Do any of your products or production processes contain or utilise PFAS compounds ("Forever Chemicals")?',
  },
  {
    id: 'S3-3',
    row: 19,
    displaySection: 'S3',
    displayId: 'S3-3',
    esrs: 'E2-3',
    long: true,
    templateText:
      'If your products contain PFAS, detail your substitution roadmap. Have you identified viable non-PFAS alternatives? Provide your target date for a complete phase-out.',
  },
  {
    id: 'S3-4',
    row: 20,
    displaySection: 'S3',
    displayId: 'S3-4',
    esrs: 'E2-2',
    long: true,
    templateText:
      'Describe your industrial wastewater treatment process. What specific measures are in place to ensure zero leakage of hazardous chemicals into local water systems?',
  },
  {
    id: 'S4-1',
    row: 22,
    displaySection: 'S4',
    displayId: 'S4-1',
    esrs: 'E3-1',
    long: false,
    templateText: 'Total water withdrawal last fiscal year (m³). ',
  },
  {
    // Defect one: tagged S5 in the workbook, carries an E3-2 reference, and
    // belongs in Water & Marine Resources. Matched by question text only.
    id: 'S4-2',
    row: 23,
    displaySection: 'S4',
    displayId: 'S4-2',
    esrs: 'E3-2',
    long: false,
    templateText: 'Specify source.',
  },
  {
    id: 'S4-3',
    row: 24,
    displaySection: 'S4',
    displayId: 'S4-3',
    esrs: 'E3-1',
    long: false,
    templateText:
      'Is your primary production facility located in a high-water-stress region (WRI Aqueduct score ≥3)?',
  },
  {
    id: 'S4-4',
    row: 25,
    displaySection: 'S4',
    displayId: 'S4-4',
    esrs: 'E3-2',
    long: true,
    templateText:
      'Provide details on any water-saving or closed-loop recycling projects implemented at your facility. How has your total water intensity (litres per unit produced) changed over the last three years?',
  },
  {
    id: 'S4-5',
    row: 26,
    displaySection: 'S4',
    displayId: 'S4-5',
    esrs: 'E3-2',
    long: true,
    templateText:
      'If your facility is in a high-water-stress region, what is your operational contingency plan for severe drought conditions to ensure supply continuity to The Corporate?',
  },
  {
    id: 'S5-1',
    row: 28,
    displaySection: 'S5',
    displayId: 'S5-1',
    esrs: 'E5-2',
    long: true,
    templateText:
      'Total waste generated last fiscal year (tonnes). Breakdown: landfill / recycled / energy recovery / hazardous.',
  },
  {
    id: 'S5-2',
    row: 29,
    displaySection: 'S5',
    displayId: 'S5-2',
    esrs: 'E5-4',
    long: false,
    templateText:
      'Percentage of post-consumer recycled (PCR) content in the components supplied to The Corporate (%).',
  },
  {
    id: 'S5-3',
    row: 30,
    displaySection: 'S5',
    displayId: 'S5-3',
    esrs: 'E5-3',
    long: true,
    templateText:
      'How are you incorporating circularity into the specific components you supply to The Corporate? Examples: design for disassembly, modularity, or increasing PCR content.',
  },
  {
    id: 'S5-4',
    row: 31,
    displaySection: 'S5',
    displayId: 'S5-4',
    esrs: 'E5-2',
    long: true,
    templateText:
      'Detail your strategy for achieving Zero Waste to Landfill. What are your primary waste streams, and what innovative recycling or upcycling initiatives have you launched recently?',
  },
  {
    id: 'S6-1',
    row: 33,
    displaySection: 'S6',
    displayId: 'S6-1',
    esrs: 'E4-2',
    long: false,
    templateText:
      'Are any of your production sites located within or adjacent to (within 1 km) a protected area or biodiversity hotspot?',
  },
  {
    id: 'S6-2',
    row: 34,
    displaySection: 'S6',
    displayId: 'S6-2',
    esrs: 'E4-3',
    long: true,
    templateText:
      'Describe any initiatives taken to minimise the impact of your operations on local biodiversity. Include land-use management, native planting schemes, or light/noise pollution reduction.',
  },
  {
    id: 'S6-3',
    row: 35,
    displaySection: 'S6',
    displayId: 'S6-3',
    esrs: 'E4-5',
    long: true,
    templateText:
      'Have you undertaken a biodiversity impact assessment (TNFD or equivalent) for your primary production sites? If yes, share key findings. If no, provide your target assessment date.',
  },
  {
    id: 'S7-1',
    row: 37,
    displaySection: 'S7',
    displayId: 'S7-1',
    esrs: 'S2-1',
    long: false,
    templateText:
      'Does your organisation have a formal Human Rights and Labour Rights Policy, aligned with the UN Guiding Principles on Business and Human Rights?',
  },
  {
    id: 'S7-2',
    row: 38,
    displaySection: 'S7',
    displayId: 'S7-2',
    esrs: 'S2-2',
    long: false,
    templateText:
      'Have you conducted a human rights due diligence assessment of your Tier 1 and Tier 2 supply chains in the last 24 months?',
  },
  {
    id: 'S7-3',
    row: 39,
    displaySection: 'S7',
    displayId: 'S7-3',
    esrs: 'S2-4',
    long: true,
    templateText:
      'Describe the grievance mechanism available to workers in your supply chain. How many grievances were filed and resolved in the last 12 months?',
  },
  {
    id: 'S7-4',
    row: 40,
    displaySection: 'S7',
    displayId: 'S7-4',
    esrs: 'G1-1',
    long: false,
    templateText:
      'Does your organisation have a verified conflict minerals policy (3TG — tin, tantalum, tungsten, gold) in place, including OECD Due Diligence guidance compliance?',
  },
  {
    id: 'S7-5',
    row: 41,
    displaySection: 'S7',
    displayId: 'S7-5',
    esrs: 'G1-2',
    long: true,
    templateText:
      'Describe your supplier code of conduct and how compliance is monitored across your own supply chain. Include details of any third-party audits conducted in the last 24 months.',
  },
]

export const UPLOAD_IDS = TEMPLATE_ROWS.map((r) => r.id)

// ---------------------------------------------------------------------------
// The guided form — twenty-eight fields across S2–S7, spec Section 8 order.
// The wording here is the corrected wording; the workbook's is not reused.
// ---------------------------------------------------------------------------
export const GUIDED_FIELDS = [
  // S2 — Climate & Decarbonisation
  {
    id: 'S2-1',
    section: 'S2',
    esrs: 'E1-4',
    type: 'longtext',
    label:
      'Total Scope 1 emissions for last fiscal year (metric tonnes CO₂e). Include verification method.',
  },
  {
    id: 'S2-2',
    section: 'S2',
    esrs: 'E1-4',
    type: 'number',
    label: 'Total Scope 2 emissions for last fiscal year — market-based (metric tonnes CO₂e).',
  },
  {
    id: 'S2-3',
    section: 'S2',
    esrs: 'E1-4',
    type: 'number',
    label: 'Total Scope 3 emissions for last fiscal year (metric tonnes CO₂e).',
  },
  {
    id: 'S2-4',
    section: 'S2',
    esrs: 'E1-4',
    type: 'longtext',
    label: 'Specify which Scope 3 categories are included.',
  },
  {
    id: 'S2-5',
    section: 'S2',
    esrs: 'E1-3',
    type: 'select',
    label:
      'Does your organisation have a Science-Based Target (SBTi) validated decarbonisation target?',
    options: ['Yes — validated', 'Yes — submitted, awaiting validation', 'In progress', 'No'],
  },
  {
    id: 'S2-6',
    section: 'S2',
    esrs: 'E1-2',
    type: 'longtext',
    label:
      'Describe your top three decarbonisation projects currently in progress or planned for the next 24 months. Include estimated tCO₂e reduction and the specific technology being utilised (e.g. electrification of heat, on-site renewables).',
  },
  {
    id: 'S2-7',
    section: 'S2',
    esrs: 'E1-2',
    type: 'longtext',
    label:
      'What are the primary technical or financial barriers preventing you from reaching a 50% reduction in Scope 1 and 2 emissions by 2030?',
  },

  // S3 — Pollution & PFAS
  {
    id: 'S3-1',
    section: 'S3',
    esrs: 'E2-3',
    type: 'number',
    label:
      'Total weight of substances of concern (REACH, SVHC list) used in production last fiscal year (kg).',
  },
  {
    id: 'S3-2',
    section: 'S3',
    esrs: 'E2-3',
    type: 'select',
    label:
      'Do any of your products or production processes contain or utilise PFAS compounds ("forever chemicals")?',
    options: ['Yes', 'No', 'Under investigation'],
  },
  {
    id: 'S3-3',
    section: 'S3',
    esrs: 'E2-3',
    type: 'longtext',
    label:
      'If your products contain PFAS, detail your substitution roadmap. Have you identified viable non-PFAS alternatives? Provide your target date for a complete phase-out.',
  },
  {
    id: 'S3-4',
    section: 'S3',
    esrs: 'E2-2',
    type: 'longtext',
    label:
      'Describe your industrial wastewater treatment process. What specific measures are in place to ensure zero leakage of hazardous chemicals into local water systems?',
  },

  // S4 — Water & Marine Resources. S4-2 is the row the workbook mis-tags as S5.
  {
    id: 'S4-1',
    section: 'S4',
    esrs: 'E3-1',
    type: 'number',
    label: 'Total water withdrawal last fiscal year (m³).',
  },
  {
    id: 'S4-2',
    section: 'S4',
    esrs: 'E3-2',
    type: 'select',
    label: 'Specify the primary source of that water withdrawal.',
    options: [
      'Municipal supply',
      'Groundwater',
      'Surface water',
      'Rainwater harvesting',
      'Seawater or desalinated',
      'Mixed sources',
    ],
  },
  {
    id: 'S4-3',
    section: 'S4',
    esrs: 'E3-1',
    type: 'select',
    label:
      'Is your primary production facility located in a high-water-stress region (WRI Aqueduct score ≥ 3)?',
    options: ['Yes', 'No', 'Not assessed'],
  },
  {
    id: 'S4-4',
    section: 'S4',
    esrs: 'E3-2',
    type: 'longtext',
    label:
      'Provide details on any water-saving or closed-loop recycling projects implemented at your facility. How has your total water intensity (litres per unit produced) changed over the last three years?',
  },
  {
    id: 'S4-5',
    section: 'S4',
    esrs: 'E3-2',
    type: 'longtext',
    label:
      'If your facility is in a high-water-stress region, what is your operational contingency plan for severe drought conditions to ensure supply continuity to The Corporate?',
  },

  // S5 — Circular Economy & Waste
  {
    id: 'S5-1',
    section: 'S5',
    esrs: 'E5-2',
    type: 'longtext',
    label:
      'Total waste generated last fiscal year (tonnes). Provide the breakdown: landfill / recycled / energy recovery / hazardous.',
  },
  {
    id: 'S5-2',
    section: 'S5',
    esrs: 'E5-4',
    type: 'number',
    min: 0,
    max: 100,
    label:
      'Percentage of post-consumer recycled (PCR) content in the components supplied to The Corporate (%).',
  },
  {
    id: 'S5-3',
    section: 'S5',
    esrs: 'E5-3',
    type: 'longtext',
    label:
      'How are you incorporating circularity into the specific components you supply to The Corporate? Examples: design for disassembly, modularity, or increasing PCR content.',
  },
  {
    id: 'S5-4',
    section: 'S5',
    esrs: 'E5-2',
    type: 'longtext',
    label:
      'Detail your strategy for achieving Zero Waste to Landfill. What are your primary waste streams, and what innovative recycling or upcycling initiatives have you launched recently?',
  },

  // S6 — Biodiversity & Ecosystems
  {
    id: 'S6-1',
    section: 'S6',
    esrs: 'E4-2',
    type: 'select',
    label:
      'Are any of your production sites located within or adjacent to (within 1 km) a protected area or biodiversity hotspot?',
    options: ['Yes', 'No', 'Not assessed'],
  },
  {
    id: 'S6-2',
    section: 'S6',
    esrs: 'E4-3',
    type: 'longtext',
    label:
      'Describe any initiatives taken to minimise the impact of your operations on local biodiversity. Include land-use management, native planting schemes, or light/noise pollution reduction.',
  },
  {
    id: 'S6-3',
    section: 'S6',
    esrs: 'E4-5',
    type: 'longtext',
    label:
      'Have you undertaken a biodiversity impact assessment (TNFD or equivalent) for your primary production sites? If yes, share key findings. If no, provide your target assessment date.',
  },

  // S7 — Social, Labour & Governance
  {
    id: 'S7-1',
    section: 'S7',
    esrs: 'S2-1',
    type: 'select',
    label:
      'Does your organisation have a formal Human Rights and Labour Rights Policy, aligned with the UN Guiding Principles on Business and Human Rights?',
    options: ['Yes', 'In development', 'No'],
  },
  {
    id: 'S7-2',
    section: 'S7',
    esrs: 'S2-2',
    type: 'select',
    label:
      'Have you conducted a human rights due diligence assessment of your Tier 1 and Tier 2 supply chains in the last 24 months?',
    options: ['Yes — both tiers', 'Yes — Tier 1 only', 'In progress', 'No'],
  },
  {
    id: 'S7-3',
    section: 'S7',
    esrs: 'S2-4',
    type: 'longtext',
    label:
      'Describe the grievance mechanism available to workers in your supply chain. How many grievances were filed and resolved in the last 12 months?',
  },
  {
    id: 'S7-4',
    section: 'S7',
    esrs: 'G1-1',
    type: 'select',
    label:
      'Does your organisation have a verified conflict minerals policy (3TG — tin, tantalum, tungsten, gold) in place, including OECD Due Diligence guidance compliance?',
    options: ['Yes', 'In development', 'No', 'Not applicable to our products'],
  },
  {
    id: 'S7-5',
    section: 'S7',
    esrs: 'G1-2',
    type: 'longtext',
    label:
      'Describe your supplier code of conduct and how compliance is monitored across your own supply chain. Include details of any third-party audits conducted in the last 24 months.',
  },
]

export const GUIDED_IDS = GUIDED_FIELDS.map((f) => f.id)

// ---------------------------------------------------------------------------
// The universal Company & Contact step — spec v3.0 Section 8.
//
// Defined once and rendered identically as the first step of all four doors
// (Views 3a, 3b, 5, 6), which is what acceptance criterion 2 checks. Order and
// wording are the spec's and must match across every door. These are the five
// fields that used to be "S1" in Path B, and which Path A did not ask for at
// all beyond three of them.
//
// `key` is the session-state key on state.identity; it is also the suffix of
// the resolve_company() argument, so the two cannot drift apart.
// ---------------------------------------------------------------------------
export const IDENTITY_FIELDS = [
  { key: 'company', type: 'text', label: 'Company legal name', autoComplete: 'organization' },
  { key: 'registeredCountry', type: 'text', label: 'Registered country', autoComplete: 'country-name' },
  { key: 'contactName', type: 'text', label: 'Primary contact name', autoComplete: 'name' },
  { key: 'contactTitle', type: 'text', label: 'Primary contact title', autoComplete: 'organization-title' },
  { key: 'contactEmail', type: 'email', label: 'Primary contact email', autoComplete: 'email' },
]

export const IDENTITY_KEYS = IDENTITY_FIELDS.map((f) => f.key)

export const guidedFieldsFor = (sectionId) =>
  GUIDED_FIELDS.filter((f) => f.section === sectionId)

export const DECLARATION_TEXT =
  'I confirm that the information provided in this assessment is accurate and complete to the best of my knowledge.'
