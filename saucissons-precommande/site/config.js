/*
 * config.js : réglages de la page.
 *
 * ATTENTION : ces valeurs sont uniquement un AFFICHAGE. Le serveur (backend/Config.gs)
 * est la seule source de vérité pour les prix, la réduction, la date limite, les patrouilles
 * et les modes de retrait, et il recalcule tout lui-même. Si une valeur d'ici ne correspond pas
 * à Config.gs, le serveur refuse la commande avec le message "Les prix ont été mis à jour".
 *
 * Les valeurs ci-dessous sont des EXEMPLES à remplacer avant le lancement.
 */
const CONFIG = {

  /* Adresse du serveur : l'URL de déploiement Apps Script (elle se termine par /exec).
     Laisser vide ("") = mode test : la page fonctionne seule, sans rien envoyer. */
  urlBackend: "",

  /* Date limite affichée aux clients (le serveur applique la vraie, dans Config.gs). */
  dateLimiteTexte: "06/12/2026",

  /* Adresse affichée en cas de problème. */
  contact: "troupeadestexupery@gmail.com",

  /* Saucissons : prix en CENTIMES (700 = 7,00 €). Les id doivent être identiques à ceux de Config.gs. */
    saucissons: [
    { id: "pur-porc", nom: "Pur Porc", description: "Le classique, 100 % porc.", poids: "170 g", prixCentimes: 600 },
    { id: "sanglier", nom: "Sanglier", description: "Une saveur de gibier.", poids: "170 g", prixCentimes: 600 },
    { id: "fume", nom: "Fumé", description: "Au goût fumé.", poids: "170 g", prixCentimes: 600 },
    { id: "piment-espelette", nom: "Piment Espelette", description: "Relevé au piment d'Espelette.", poids: "170 g", prixCentimes: 600 },
    { id: "ail", nom: "À l'Ail", description: "Parfumé à l'ail.", poids: "170 g", prixCentimes: 600 },
    { id: "cepes", nom: "Cèpes", description: "Aux cèpes.", poids: "170 g", prixCentimes: 600 },
    { id: "comte", nom: "Comté AOP", description: "Au comté AOP.", poids: "170 g", prixCentimes: 600 },
    { id: "noisette", nom: "Noisette", description: "Aux noisettes.", poids: "170 g", prixCentimes: 600 },
    { id: "noix", nom: "Noix", description: "Aux noix.", poids: "170 g", prixCentimes: 600 },
    { id: "enrobage-poivre", nom: "Enrobage Poivre", description: "Enrobé de poivre.", poids: "170 g", prixCentimes: 600 },
    { id: "enrobage-herbes", nom: "Enrobage Herbe de Provence", description: "Enrobé d'herbes de Provence.", poids: "170 g", prixCentimes: 600 }
  ],

  /* Textes identiques à ceux de Config.gs. */
  patrouilles: ["Gibbons", "Pandas", "Koalas", "Toute la troupe"],
  retraits: [
    "Remise en main propre le [date] à [lieu]",
    "Remise via mon animé ou ma famille scoute"
  ],

  /* Règles de la vente (identiques à Config.gs). */
  quantiteMax: 20,
  reductionAPartirDe: 4,
  reductionNumerateur: 1,
  reductionDenominateur: 12
};
