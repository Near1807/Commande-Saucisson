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
  { id: "pur-porc", nom: "Pur Porc", prixCentimes: 600, prixAchatCentimes: 350 },
  { id: "sanglier", nom: "Sanglier", prixCentimes: 600, prixAchatCentimes: 350 },
  { id: "fume", nom: "Fumé", prixCentimes: 600, prixAchatCentimes: 350 },
  { id: "piment-espelette", nom: "Piment Espelette", prixCentimes: 600, prixAchatCentimes: 350 },
  { id: "ail", nom: "À l'Ail", prixCentimes: 600, prixAchatCentimes: 350 },
  { id: "cepes", nom: "Cèpes", prixCentimes: 600, prixAchatCentimes: 350 },
  { id: "comte", nom: "Comté AOP", prixCentimes: 600, prixAchatCentimes: 350 },
  { id: "noisette", nom: "Noisette", prixCentimes: 600, prixAchatCentimes: 350 },
  { id: "noix", nom: "Noix", prixCentimes: 600, prixAchatCentimes: 350 },
  { id: "enrobage-poivre", nom: "Enrobage Poivre", prixCentimes: 600, prixAchatCentimes: 350 },
  { id: "enrobage-herbes", nom: "Enrobage Herbe de Provence", prixCentimes: 600, prixAchatCentimes: 350 }
];

/* Choix proposé aux clients qui ne veulent soutenir aucune patrouille en particulier. */
const CHOIX_TOUTE_LA_TROUPE = "Toute la troupe";

/* Les patrouilles. Les textes doivent être IDENTIQUES à ceux de site/config.js. */
const PATROUILLES = ["Gibbons", "Pandas", "Koalas", CHOIX_TOUTE_LA_TROUPE];

/* Les modes de retrait. Les textes doivent être IDENTIQUES à ceux de site/config.js. */
const RETRAITS = [
  "Remise en main propre le [date] à [lieu]",
  "Remise via mon animé ou ma famille scoute"
];

/* Réduction : on déduit REDUCTION_NUMERATEUR / REDUCTION_DENOMINATEUR du total de la commande
   (1 / 6 = un sixième) dès que le NOMBRE TOTAL de saucissons (toutes sortes confondues)
   atteint REDUCTION_A_PARTIR_DE. Avec des saucissons à 6 €, 1/6 de réduction donne 5 € la pièce. */
const REDUCTION_A_PARTIR_DE = 3;
const REDUCTION_NUMERATEUR = 1;
const REDUCTION_DENOMINATEUR = 6;

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
const EMAIL_CONTACT = "troupeadestexupery@gmail.com";
const NOM_EXPEDITEUR = "Éclaireurs Saint-Paul Waterloo";

/* Noms des onglets du Google Sheet. */
const NOM_FEUILLE_COMMANDES = "Commandes";
const NOM_FEUILLE_SYNTHESE = "Synthèse";
