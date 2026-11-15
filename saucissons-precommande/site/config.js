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
  contact: "contact@exemple.be",

  /* Saucissons : prix en CENTIMES (700 = 7,00 €). Les id doivent être identiques à ceux de Config.gs. */
  saucissons: [
    { id: "nature", nom: "Nature",    description: "Le classique, à trancher fin pour l'apéro.", poids: "env. 200 g", prixCentimes: 700 },
    { id: "ail",    nom: "À l'ail",   description: "Franc et parfumé.",                          poids: "env. 200 g", prixCentimes: 700 },
    { id: "poivre", nom: "Au poivre", description: "Une croûte poivrée, bien relevé.",           poids: "env. 200 g", prixCentimes: 750 },
    { id: "noix",   nom: "Aux noix",  description: "Des morceaux de noix, texture croquante.",   poids: "env. 200 g", prixCentimes: 800 },
    { id: "gouda",  nom: "Au gouda",  description: "Fondant, avec des dés de fromage.",          poids: "env. 200 g", prixCentimes: 800 },
    { id: "piment", nom: "Au piment", description: "Pour ceux qui aiment qu'on le sente.",       poids: "env. 200 g", prixCentimes: 750 }
  ],

  /* Textes identiques à ceux de Config.gs. */
  patrouilles: ["Aigles", "Faucons", "Lynx", "Renards", "Toute la troupe"],
  retraits: [
    "Remise en main propre le [date] à [lieu]",
    "Remise via mon animé ou ma famille scoute"
  ],

  /* Règles de la vente (identiques à Config.gs). */
  quantiteMax: 20,
  reductionAPartirDe: 6,
  reductionPourcent: 25
};
