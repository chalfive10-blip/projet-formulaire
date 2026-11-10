// Questions du formulaire Chal Five : modifiez ici pour ajouter ou retirer une question.
// type "choice" = une seule réponse ; type "multi" = plusieurs réponses possibles.
export const QUESTIONS = [
  {
    id: "nom",
    label: "Nom et prénoms",
    kicker: "Faisons connaissance",
    title: ["Comment vous", "appelez‑vous", "?"],
    hl: 1,
    type: "text",
    placeholder: "Votre nom et vos prénoms",
    autoComplete: "name",
    required: true,
  },
  {
    id: "age",
    label: "Âge",
    kicker: "Faisons connaissance",
    title: ["Quel âge", "avez‑vous", "?"],
    hl: 1,
    type: "number",
    placeholder: "Ex. 27",
    min: 5,
    max: 99,
    required: true,
  },
  {
    id: "telephone",
    label: "Téléphone WhatsApp",
    kicker: "Pour vous joindre",
    title: ["Votre numéro", "WhatsApp", "?"],
    hl: 1,
    hint: "Nous vous répondons rapidement, promis.",
    type: "tel",
    placeholder: "6 XX XX XX XX",
    autoComplete: "tel",
    required: true,
  },
  {
    id: "email",
    label: "E-mail",
    kicker: "Facultatif",
    title: ["Une adresse", "e-mail", "?"],
    hl: 1,
    hint: "Vous pouvez passer cette question.",
    type: "email",
    placeholder: "vous@exemple.com",
    autoComplete: "email",
    required: false,
  },
  {
    id: "source",
    label: "Comment avez-vous connu Chal Five ?",
    kicker: "Votre chemin jusqu'à nous",
    title: ["Comment avez-vous", "connu Chal Five", "?"],
    hl: 1,
    type: "multi",
    required: true,
    options: [
      "Facebook",
      "Instagram",
      "TikTok",
      "WhatsApp",
      "Google ou Internet",
      "Recommandation d'un ami ou d'un proche",
      "Passage devant le complexe",
      "Partenaire ou entreprise",
      "Événement ou activité",
    ],
    other: "Autre",
    // Options qui ouvrent un champ à compléter (texte d'aide affiché dans le champ)
    details: { "Partenaire ou entreprise": "Nom du partenaire ou de l'entreprise" },
  },
  {
    id: "service",
    label: "Services qui vous intéressent",
    kicker: "Votre envie du moment",
    title: ["Qu'est-ce qui", "vous tente", "?"],
    hl: 1,
    type: "multi",
    required: true,
    options: [
      "Réservation d'un terrain de futsal",
      "Activités sportives",
      "Kinésithérapie et bien-être",
      "Terrasse et espace de détente",
      "Salon de thé",
      "Partenariat professionnel",
    ],
    other: "Autre",
    // Options qui ouvrent des sous-choix (au moins un à cocher, plusieurs possibles)
    sub: { "Réservation d'un terrain de futsal": ["Séance de futsal", "Évènementiel"] },
  },
  {
    id: "moment",
    label: "Moment préféré pour venir",
    kicker: "Pour mieux vous accueillir",
    title: ["Quand souhaiteriez-vous", "passer", "?"],
    hl: 1,
    type: "multi",
    required: true,
    options: [
      "En semaine, en journée",
      "En semaine, en soirée",
      "Le week-end",
      "Peu importe, je m'adapte",
    ],
    // Réponse qui annule les autres (et inversement)
    exclusive: ["Peu importe, je m'adapte"],
  },
  {
    id: "offres",
    label: "Souhaite recevoir nos offres et activités",
    kicker: "Dernière question",
    title: ["On vous tient", "au courant", "?"],
    hl: 1,
    hint: "Offres, tournois, nouveautés. Jamais de spam.",
    type: "choice",
    required: true,
    options: ["Oui", "Non"],
    final: true,
  },
];

export const REDIRECT_URL = "https://www.chalfive.com";

// Validation partagée (client + serveur)
export function validateValue(q, raw) {
  const v = (raw ?? "").toString().trim();
  if (!v) return q.required ? "Cette réponse est nécessaire." : null;
  if (q.id === "nom" && v.length < 3) return "Indiquez votre nom et prénom(s).";
  if (q.type === "number") {
    const n = Number(v);
    if (!Number.isInteger(n) || n < q.min || n > q.max) return `Indiquez un âge entre ${q.min} et ${q.max}.`;
  }
  if (q.type === "tel") {
    const digits = v.replace(/\D/g, "");
    if (!/^[+\d\s().-]+$/.test(v) || digits.length < 8 || digits.length > 15) return "Ce numéro semble incomplet.";
  }
  if (q.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Cette adresse e-mail semble incorrecte.";
  if (v.length > 200) return "Réponse trop longue.";
  return null;
}
