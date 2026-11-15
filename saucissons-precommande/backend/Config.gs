/*
 * Config.gs : TOUTE la configuration de la vente côté serveur.
 *
 * C'est ici que le serveur prend ses prix et ses règles. La page web (site/config.js)
 * affiche une copie de certaines de ces valeurs, mais le serveur ne lui fait JAMAIS
 * confiance : il recalcule tout à partir de ce fichier.
 *
 * Les valeurs ci-dessous sont des EXEMPLES à remplacer avant le lancement.
 */

/* Les saucissons en vente. Les prix sont en CENTIMES (700 = 7,00 €) pour éviter les erreurs d'arrondi.
   prixAchatCentimes sert uniquement à calculer la marge dans l'onglet "Synthèse". */
const SAUCISSONS = [
  { id: "nature", nom: "Nature",    prixCentimes: 700, prixAchatCentimes: 500 },
  { id: "ail",    nom: "À l'ail",   prixCentimes: 700, prixAchatCentimes: 500 },
  { id: "poivre", nom: "Au poivre", prixCentimes: 750, prixAchatCentimes: 540 },
  { id: "noix",   nom: "Aux noix",  prixCentimes: 800, prixAchatCentimes: 580 },
  { id: "gouda",  nom: "Au gouda",  prixCentimes: 800, prixAchatCentimes: 580 },
  { id: "piment", nom: "Au piment", prixCentimes: 750, prixAchatCentimes: 540 }
];

/* Choix proposé aux clients qui ne veulent soutenir aucune patrouille en particulier. */
const CHOIX_TOUTE_LA_TROUPE = "Toute la troupe";

/* Les patrouilles. Les textes doivent être IDENTIQUES à ceux de site/config.js. */
const PATROUILLES = ["Aigles", "Faucons", "Lynx", "Renards", CHOIX_TOUTE_LA_TROUPE];

/* Les modes de retrait. Les textes doivent être IDENTIQUES à ceux de site/config.js. */
const RETRAITS = [
  "Remise en main propre le [date] à [lieu]",
  "Remise via mon animé ou ma famille scoute"
];

/* Réduction : REDUCTION_POURCENT % sur le total de la commande dès que le NOMBRE TOTAL
   de saucissons (toutes sortes confondues) atteint REDUCTION_A_PARTIR_DE. */
const REDUCTION_A_PARTIR_DE = 6;
const REDUCTION_POURCENT = 25;

/* Quantité maximale par sorte de saucisson et par commande. */
const QUANTITE_MAX = 20;

/* Après cette date et cette heure, le serveur refuse les commandes (heure de Belgique, hiver = +01:00, été = +02:00). */
const DATE_LIMITE_ISO = "2026-12-06T23:59:59+01:00";

/* Informations de paiement affichées sur la page et dans le mail. */
const IBAN = "BE00 0000 0000 0000";
const TITULAIRE = "Unité Saint-Paul Waterloo";
const PREFIXE_COMMUNICATION = "SAUCISSONS";

/* Partage de la marge : la patrouille choisie reçoit ce pourcentage de la marge,
   la troupe reçoit le reste. Si le client choisit "Toute la troupe", la troupe reçoit tout. */
const PART_PATROUILLE_POURCENT = 50;

/* Mail : adresse de contact (aussi utilisée comme adresse de réponse) et nom de l'expéditeur. */
const EMAIL_CONTACT = "contact@exemple.be";
const NOM_EXPEDITEUR = "Éclaireurs Saint-Paul Waterloo";

/* Noms des onglets du Google Sheet. */
const NOM_FEUILLE_COMMANDES = "Commandes";
const NOM_FEUILLE_SYNTHESE = "Synthèse";
