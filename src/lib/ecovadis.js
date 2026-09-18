// The nine EcoVadis questions, spec Section 8 View 3b.
// The source file spells Q8 and Q9 as "recieved" and "cicle". Both are
// corrected here; the corrected wording is authoritative.

export const ECOVADIS_QUESTIONS = [
  { id: 'Q1', type: 'date', label: 'Publication date' },
  { id: 'Q2', type: 'date', label: 'Valid until' },
  { id: 'Q3', type: 'score', label: 'Overall EcoVadis score' },
  { id: 'Q4', type: 'score', label: 'Environment score' },
  { id: 'Q5', type: 'score', label: 'Labor & Human Rights score' },
  { id: 'Q6', type: 'score', label: 'Ethics score' },
  { id: 'Q7', type: 'score', label: 'Sustainable procurement score' },
  {
    id: 'Q8',
    type: 'select',
    label: 'Did your organisation receive a medal in the last cycle?',
    options: ['None', 'Bronze', 'Silver', 'Gold', 'Platinum'],
  },
  {
    id: 'Q9',
    type: 'select',
    label: 'Did your organisation receive a badge in the last cycle?',
    options: ['None', 'Committed', 'Other'],
  },
]

export const ECOVADIS_IDS = ECOVADIS_QUESTIONS.map((q) => q.id)
