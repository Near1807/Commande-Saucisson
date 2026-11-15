/*
 * Code.gs : l'arrière-boutique de la précommande de saucissons.
 *
 * Ce que fait ce fichier, dans l'ordre :
 *   1. doPost reçoit une commande envoyée par la page web.
 *   2. traiterCommande la vérifie, recalcule le prix, puis l'écrit dans le Google Sheet.
 *   3. Un mail récapitulatif est envoyé au client.
 *   4. La réponse (numéro, montant, communication de virement) est renvoyée à la page.
 *
 * Règle d'or : le prix est TOUJOURS recalculé ici, à partir de Config.gs.
 * Le total envoyé par la page ne sert qu'à détecter une page périmée.
 *
 * Ce script est "lié" au Google Sheet (créé depuis Extensions > Apps Script dans le Sheet).
 * Toute la configuration (prix, patrouilles, IBAN, date limite) est dans Config.gs.
 */


/* ============================================================
   1. POINTS D'ENTRÉE (appelés par Google quand la page nous écrit)
   ============================================================ */

/*
 * @brief Répond aux requêtes GET (ouverture de l'adresse dans un navigateur). Ne renvoie qu'un texte de contrôle, aucune donnée.
 * @param e Objet événement fourni par Google (non utilisé).
 */
function doGet(e) {
  return ContentService.createTextOutput("Le serveur de précommande fonctionne.");
}

/*
 * @brief Reçoit une commande envoyée par la page (POST avec du JSON), la traite et renvoie la réponse en JSON.
 * @param e Objet événement fourni par Google ; e.postData.contents contient le JSON envoyé par la page.
 */
function doPost(e) {
  let reponse;

  try {
    const donnees = JSON.parse(e.postData.contents);
    reponse = traiterCommande(donnees);
  } catch (erreur) {
    console.error("Erreur dans doPost : " + erreur);
    reponse = {
      ok: false,
      erreur: "Une erreur est survenue sur le serveur. Réessayez dans un instant ou contactez " + EMAIL_CONTACT + "."
    };
  }

  return ContentService
    .createTextOutput(JSON.stringify(reponse))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ============================================================
   2. TRAITEMENT D'UNE COMMANDE
   ============================================================ */

/*
 * @brief Traite une commande de bout en bout : contrôle de la date limite, vérification des données, écriture dans le Sheet, envoi du mail.
 * @param donnees Objet reçu de la page (déjà converti depuis le JSON), non fiable tant qu'il n'est pas vérifié.
 */
function traiterCommande(donnees) {
  // Étape 1 : la vente est-elle encore ouverte ?
  if (new Date() > new Date(DATE_LIMITE_ISO)) {
    return {
      ok: false,
      erreur: "Les commandes sont closes depuis le " + formaterDate(DATE_LIMITE_ISO) + "."
    };
  }

  // Étape 2 : vérifier toutes les données et recalculer le prix.
  const verification = verifierDonnees(donnees);
  if (verification.erreur) {
    return { ok: false, erreur: verification.erreur };
  }
  const commande = verification.commande;

  // Étape 3 : écrire dans le Sheet. Le verrou empêche deux commandes simultanées
  // de recevoir le même numéro ou d'écrire sur la même ligne.
  const verrou = LockService.getScriptLock();
  verrou.waitLock(30000);

  let feuille;
  let numeroDeLigne;
  try {
    feuille = ouvrirFeuilleCommandes();
    commande.numero = lireProchainNumero(feuille);
    commande.numeroTexte = formaterNumero(commande.numero);
    commande.communication = construireCommunication(commande);
    numeroDeLigne = ecrireCommande(feuille, commande);
  } finally {
    verrou.releaseLock();
  }

  // Étape 4 : envoyer le mail. Si le mail échoue, la commande reste enregistrée.
  const mailEnvoye = envoyerMail(commande, feuille, numeroDeLigne);

  // Étape 5 : préparer la réponse pour la page (montants en centimes).
  return { ok: true, commande: construireReponse(commande, mailEnvoye) };
}


/* ============================================================
   3. VÉRIFICATION DES DONNÉES ET CALCUL DU PRIX
   ============================================================ */

/*
 * @brief Vérifie une commande reçue de la page. Renvoie { erreur: "message" } si quelque chose ne va pas, sinon { commande: {...} } avec les données nettoyées et les montants recalculés.
 * @param donnees Objet reçu de la page, considéré comme non fiable.
 */
function verifierDonnees(donnees) {
  if (donnees === null || typeof donnees !== "object") {
    return { erreur: "Commande illisible." };
  }

  // Champ piège : invisible pour un humain, un robot le remplit.
  if (donnees.site_web) {
    return { erreur: "Commande refusée." };
  }

  if (donnees.consentement !== true) {
    return { erreur: "Veuillez accepter l'utilisation de vos coordonnées pour cette commande." };
  }

  // Textes : on nettoie (espaces, caractères de contrôle) et on limite la longueur.
  const prenom = nettoyerTexte(donnees.prenom, 60);
  const nom = nettoyerTexte(donnees.nom, 60);
  const email = nettoyerTexte(donnees.email, 120);
  const telephone = nettoyerTexte(donnees.telephone, 30);
  const remarque = nettoyerTexte(donnees.remarque, 500);

  if (prenom === "" || nom === "") {
    return { erreur: "Indiquez votre prénom et votre nom." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { erreur: "L'adresse e-mail semble incomplète." };
  }
  if (telephone === "") {
    return { erreur: "Indiquez votre numéro de téléphone." };
  }

  // Patrouille et retrait : doivent être EXACTEMENT l'un des choix de Config.gs.
  if (PATROUILLES.indexOf(donnees.patrouille) === -1) {
    return { erreur: "Patrouille inconnue. Rechargez la page et réessayez." };
  }
  if (RETRAITS.indexOf(donnees.retrait) === -1) {
    return { erreur: "Mode de retrait inconnu. Rechargez la page et réessayez." };
  }

  // Quantités : un objet { idDuSaucisson: quantité }.
  if (donnees.quantites === null || typeof donnees.quantites !== "object") {
    return { erreur: "Quantités illisibles." };
  }

  // Refuser tout identifiant de saucisson qui n'existe pas dans Config.gs.
  const idsConnus = SAUCISSONS.map(function (s) { return s.id; });
  const idsRecus = Object.keys(donnees.quantites);
  for (let i = 0; i < idsRecus.length; i++) {
    if (idsConnus.indexOf(idsRecus[i]) === -1) {
      return { erreur: "Saucisson inconnu. Rechargez la page et réessayez." };
    }
  }

  // Construire la liste des quantités dans l'ordre de Config.gs (0 si absent).
  const quantites = [];
  for (let i = 0; i < SAUCISSONS.length; i++) {
    let quantite = donnees.quantites[SAUCISSONS[i].id];
    if (quantite === undefined) {
      quantite = 0;
    }
    if (!Number.isInteger(quantite) || quantite < 0 || quantite > QUANTITE_MAX) {
      return { erreur: "Quantité invalide pour " + SAUCISSONS[i].nom + " (de 0 à " + QUANTITE_MAX + ")." };
    }
    quantites.push(quantite);
  }

  const montants = calculerMontants(quantites);
  if (montants.nombreTotal === 0) {
    return { erreur: "Ajoutez au moins un saucisson à votre commande." };
  }

  // Sécurité contre une page périmée : si les prix ont changé depuis son chargement, on refuse.
  if (donnees.totalAttendu !== montants.total) {
    return { erreur: "Les prix ont été mis à jour. Rechargez la page et recommencez votre commande." };
  }

  return {
    commande: {
      prenom: prenom,
      nom: nom,
      email: email,
      telephone: telephone,
      remarque: remarque,
      patrouille: donnees.patrouille,
      retrait: donnees.retrait,
      quantites: quantites,
      montants: montants
    }
  };
}

/*
 * @brief Calcule le prix d'une commande à partir des prix de Config.gs. Applique la réduction si le nombre total de saucissons atteint le seuil. Tous les montants sont en centimes.
 * @param quantites Tableau des quantités, dans le même ordre que SAUCISSONS.
 */
function calculerMontants(quantites) {
  let nombreTotal = 0;
  let sousTotal = 0;

  for (let i = 0; i < SAUCISSONS.length; i++) {
    nombreTotal = nombreTotal + quantites[i];
    sousTotal = sousTotal + quantites[i] * SAUCISSONS[i].prixCentimes;
  }

  let reduction = 0;
  if (nombreTotal >= REDUCTION_A_PARTIR_DE) {
    reduction = Math.round(sousTotal * REDUCTION_NUMERATEUR / REDUCTION_DENOMINATEUR);
  }

  return {
    nombreTotal: nombreTotal,
    sousTotal: sousTotal,
    reduction: reduction,
    total: sousTotal - reduction
  };
}

/*
 * @brief Nettoie un texte reçu : le convertit en chaîne, retire les caractères de contrôle, supprime les espaces en trop et coupe à la longueur maximale.
 * @param valeur Valeur reçue (peut être de n'importe quel type).
 * @param longueurMax Nombre maximal de caractères conservés.
 */
function nettoyerTexte(valeur, longueurMax) {
  if (typeof valeur !== "string") {
    return "";
  }
  const sansControle = valeur.replace(/[\u0000-\u001F\u007F]/g, " ");
  return sansControle.trim().slice(0, longueurMax);
}

/*
 * @brief Empêche un texte d'être interprété comme une formule par Google Sheets : s'il commence par = + - ou @, une apostrophe est ajoutée devant.
 * @param texte Texte à écrire dans une cellule.
 */
function neutraliserFormule(texte) {
  if (/^[=+\-@]/.test(texte)) {
    return "'" + texte;
  }
  return texte;
}


/* ============================================================
   4. GOOGLE SHEET (la "base de données")
   ============================================================ */

/*
 * @brief Construit la liste des titres de colonnes de l'onglet Commandes, dans l'ordre exact où les valeurs sont écrites.
 */
function construireEnTetes() {
  const enTetes = [
    "Numéro", "Date", "Prénom", "Nom", "Email", "Téléphone",
    "Patrouille", "Retrait", "Remarque"
  ];
  for (let i = 0; i < SAUCISSONS.length; i++) {
    enTetes.push(SAUCISSONS[i].nom);
  }
  enTetes.push(
    "Nombre de saucissons", "Sous-total (€)", "Réduction (€)", "Total (€)",
    "Communication", "Payé", "Mail envoyé"
  );
  return enTetes;
}

/*
 * @brief Donne le numéro (à partir de 1) de chaque colonne variable de l'onglet Commandes. Les 9 premières colonnes sont fixes (Numéro à Remarque), puis viennent les saucissons.
 */
function positionsColonnes() {
  const premiereSaucisson = 10;
  const apres = premiereSaucisson + SAUCISSONS.length;
  return {
    numero: 1,
    patrouille: 7,
    premiereSaucisson: premiereSaucisson,
    nombre: apres,
    sousTotal: apres + 1,
    reduction: apres + 2,
    total: apres + 3,
    communication: apres + 4,
    paye: apres + 5,
    mail: apres + 6
  };
}

/*
 * @brief Ouvre l'onglet Commandes (le crée avec ses titres s'il n'existe pas) et vérifie que les titres correspondent à la configuration actuelle.
 */
function ouvrirFeuilleCommandes() {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  let feuille = classeur.getSheetByName(NOM_FEUILLE_COMMANDES);
  if (feuille === null) {
    feuille = classeur.insertSheet(NOM_FEUILLE_COMMANDES);
  }

  const enTetesAttendus = construireEnTetes();
  const premiereCellule = feuille.getRange(1, 1).getValue();

  if (premiereCellule === "") {
    // Feuille vide : on écrit les titres.
    feuille.getRange(1, 1, 1, enTetesAttendus.length).setValues([enTetesAttendus]);
    feuille.getRange(1, 1, 1, enTetesAttendus.length).setFontWeight("bold");
    feuille.setFrozenRows(1);
  } else {
    // Feuille existante : les titres doivent correspondre, sinon les colonnes seraient décalées.
    const enTetesPresents = feuille.getRange(1, 1, 1, enTetesAttendus.length).getValues()[0];
    if (enTetesPresents.join("|") !== enTetesAttendus.join("|")) {
      throw new Error("Les titres de l'onglet Commandes ne correspondent pas à Config.gs (liste de saucissons modifiée après le début de la vente ?).");
    }
  }
  return feuille;
}

/*
 * @brief Calcule le numéro de la prochaine commande : le numéro de la dernière ligne + 1 (ou 1 si aucune commande). À appeler uniquement quand le verrou est pris.
 * @param feuille Onglet Commandes.
 */
function lireProchainNumero(feuille) {
  const derniereLigne = feuille.getLastRow();
  if (derniereLigne <= 1) {
    return 1;
  }
  const dernierNumero = feuille.getRange(derniereLigne, 1).getValue();
  return Number(dernierNumero) + 1;
}

/*
 * @brief Écrit une commande sur une nouvelle ligne de l'onglet Commandes et renvoie le numéro de cette ligne. À appeler uniquement quand le verrou est pris.
 * @param feuille Onglet Commandes.
 * @param commande Commande vérifiée, avec numero et communication déjà remplis.
 */
function ecrireCommande(feuille, commande) {
  const colonnes = positionsColonnes();

  const ligne = [
    commande.numero,
    new Date(),
    neutraliserFormule(commande.prenom),
    neutraliserFormule(commande.nom),
    neutraliserFormule(commande.email),
    neutraliserFormule(commande.telephone),
    neutraliserFormule(commande.patrouille),
    neutraliserFormule(commande.retrait),
    neutraliserFormule(commande.remarque)
  ];
  for (let i = 0; i < SAUCISSONS.length; i++) {
    ligne.push(commande.quantites[i]);
  }
  ligne.push(
    commande.montants.nombreTotal,
    commande.montants.sousTotal / 100,
    commande.montants.reduction / 100,
    commande.montants.total / 100,
    commande.communication,
    "",   // Payé : une case à cocher est ajoutée juste après
    ""    // Mail envoyé : rempli après l'envoi du mail
  );

  feuille.appendRow(ligne);
  const numeroDeLigne = feuille.getLastRow();

  feuille.getRange(numeroDeLigne, 2).setNumberFormat("dd/MM/yyyy HH:mm");
  feuille.getRange(numeroDeLigne, colonnes.sousTotal, 1, 3).setNumberFormat("0.00");
  feuille.getRange(numeroDeLigne, colonnes.paye).insertCheckboxes();

  return numeroDeLigne;
}


/* ============================================================
   5. COMMUNICATION DE VIREMENT, MAIL ET RÉPONSE
   ============================================================ */

/*
 * @brief Transforme un numéro de commande en texte sur au moins 3 chiffres (7 devient "007").
 * @param numero Numéro de commande.
 */
function formaterNumero(numero) {
  let texte = String(numero);
  while (texte.length < 3) {
    texte = "0" + texte;
  }
  return texte;
}

/*
 * @brief Retire les accents d'un texte (é devient e) et ne garde que des caractères simples, pour une communication de virement sans caractère problématique.
 * @param texte Texte à simplifier.
 */
function enleverAccents(texte) {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, "");
}

/*
 * @brief Construit la communication de virement unique d'une commande, par exemple "SAUCISSONS 012 DUPONT MARIE".
 * @param commande Commande avec numeroTexte, nom et prenom.
 */
function construireCommunication(commande) {
  const identite = enleverAccents((commande.nom + " " + commande.prenom).toUpperCase());
  return PREFIXE_COMMUNICATION + " " + commande.numeroTexte + " " + identite;
}

/*
 * @brief Calcule le prix d'une pièce une fois la réduction appliquée (ex. 5,50 € au lieu de 6 €), pour l'afficher dans les mails. Se base sur le prix du premier saucisson, tous ayant le même prix.
 */
function calculerPrixReduit() {
  const prix = SAUCISSONS[0].prixCentimes;
  return prix - Math.round(prix * REDUCTION_NUMERATEUR / REDUCTION_DENOMINATEUR);
}

/*
 * @brief Met un montant en centimes sous la forme "12,50 €".
 * @param centimes Montant en centimes.
 */
function formaterEuros(centimes) {
  return (centimes / 100).toFixed(2).replace(".", ",") + " €";
}

/*
 * @brief Met une date ISO sous la forme "06/12/2026" (heure de Belgique).
 * @param dateIso Date au format ISO, par exemple "2026-12-06T23:59:59+01:00".
 */
function formaterDate(dateIso) {
  return Utilities.formatDate(new Date(dateIso), "Europe/Brussels", "dd/MM/yyyy");
}

/*
 * @brief Écrit le texte du mail de confirmation (texte brut, sans mise en forme) avec le récapitulatif et la demande de virement.
 * @param commande Commande vérifiée, avec numeroTexte et communication remplis.
 */
function construireTexteMail(commande) {
  const m = commande.montants;
  const lignes = [];

  lignes.push("Bonjour " + commande.prenom + ",");
  lignes.push("");
  lignes.push("Merci pour votre commande de saucissons ! Voici le récapitulatif.");
  lignes.push("");
  lignes.push("COMMANDE N° " + commande.numeroTexte);
  for (let i = 0; i < SAUCISSONS.length; i++) {
    if (commande.quantites[i] > 0) {
      const totalLigne = commande.quantites[i] * SAUCISSONS[i].prixCentimes;
      lignes.push("- " + commande.quantites[i] + " x " + SAUCISSONS[i].nom + " : " + formaterEuros(totalLigne));
    }
  }
  lignes.push("");
  lignes.push("Sous-total : " + formaterEuros(m.sousTotal));
  if (m.reduction > 0) {
    lignes.push("Tarif réduit à " + formaterEuros(calculerPrixReduit()) + " la pièce (à partir de " + REDUCTION_A_PARTIR_DE + " saucissons) : -" + formaterEuros(m.reduction));
  }
  lignes.push("TOTAL À PAYER : " + formaterEuros(m.total));
  lignes.push("");
  lignes.push("Patrouille soutenue : " + commande.patrouille);
  lignes.push("Retrait : " + commande.retrait);
  lignes.push("");
  lignes.push("POUR VALIDER VOTRE COMMANDE, merci d'effectuer un virement :");
  lignes.push("- Compte : " + IBAN);
  lignes.push("- Bénéficiaire : " + TITULAIRE);
  lignes.push("- Montant : " + formaterEuros(m.total));
  lignes.push("- Communication : " + commande.communication);
  lignes.push("");
  lignes.push("Votre commande n'est validée qu'à réception du paiement. Sans paiement avant le " + formaterDate(DATE_LIMITE_ISO) + ", elle sera annulée.");
  lignes.push("");
  lignes.push("Une question ? Répondez à ce mail ou écrivez à " + EMAIL_CONTACT + ".");
  lignes.push("");
  lignes.push("Merci pour votre soutien !");
  lignes.push(NOM_EXPEDITEUR);

  return lignes.join("\n");
}

/*
 * @brief Neutralise les caractères spéciaux HTML d'un texte saisi par le client, pour qu'il s'affiche tel quel dans le mail et ne soit jamais interprété comme du code.
 * @param texte Texte à rendre inoffensif.
 */
function echapperHtml(texte) {
  return String(texte)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/*
 * @brief Écrit la version HTML du mail de confirmation (mise en page par tableaux et styles en ligne, car les messageries ignorent les feuilles de style). Contient les mêmes informations que la version texte.
 * @param commande Commande vérifiée, avec numeroTexte et communication remplis.
 */
function construireHtmlMail(commande) {
  const m = commande.montants;
  const vert = "#2f6b3f";
  const encre = "#14301f";
  const fond = "#eef1e8";
  const trait = "#d3d9c8";
  const discret = "#566659";
  const police = "'Segoe UI', Arial, Helvetica, sans-serif";

  // Lignes du détail de la commande
  let lignesDetail = "";
  for (let i = 0; i < SAUCISSONS.length; i++) {
    if (commande.quantites[i] > 0) {
      const totalLigne = commande.quantites[i] * SAUCISSONS[i].prixCentimes;
      lignesDetail +=
        '<tr>' +
        '<td style="padding:8px 0;border-bottom:1px solid ' + trait + ';color:' + encre + ';">' + commande.quantites[i] + ' &times; ' + echapperHtml(SAUCISSONS[i].nom) + '</td>' +
        '<td style="padding:8px 0;border-bottom:1px solid ' + trait + ';color:' + encre + ';text-align:right;white-space:nowrap;">' + formaterEuros(totalLigne) + '</td>' +
        '</tr>';
    }
  }

  // Sous-total et réduction éventuelle
  let lignesTotaux =
    '<tr><td style="padding:8px 0;color:' + discret + ';">Sous-total</td>' +
    '<td style="padding:8px 0;color:' + discret + ';text-align:right;white-space:nowrap;">' + formaterEuros(m.sousTotal) + '</td></tr>';
  if (m.reduction > 0) {
    lignesTotaux +=
      '<tr><td style="padding:8px 0;color:' + vert + ';">Tarif r&eacute;duit &agrave; ' + formaterEuros(calculerPrixReduit()) + ' la pi&egrave;ce (d&egrave;s ' + REDUCTION_A_PARTIR_DE + ' saucissons)</td>' +
      '<td style="padding:8px 0;color:' + vert + ';text-align:right;white-space:nowrap;">&minus;' + formaterEuros(m.reduction) + '</td></tr>';
  }

  // Une ligne "libellé : valeur" du bloc de virement
  function ligneVirement(libelle, valeur) {
    return '<tr>' +
      '<td style="padding:6px 12px 6px 0;color:' + discret + ';white-space:nowrap;vertical-align:top;">' + libelle + '</td>' +
      '<td style="padding:6px 0;color:' + encre + ';font-weight:bold;">' + valeur + '</td>' +
      '</tr>';
  }

  return '' +
    '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:' + fond + ';font-family:' + police + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + fond + ';padding:24px 12px;"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">' +

    // En-tête
    '<tr><td style="background:' + vert + ';padding:20px 28px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="padding-right:16px;vertical-align:middle;"><img src="' + URL_LOGO + '" width="56" height="56" alt="Scouts" style="display:block;border:0;"></td>' +
    '<td style="vertical-align:middle;">' +
    '<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#d6e6d9;">Troupe Antoine de Saint-Exup&eacute;ry</div>' +
    '<div style="font-size:24px;font-weight:bold;color:#ffffff;margin-top:4px;">Commande n&deg; ' + echapperHtml(commande.numeroTexte) + '</div>' +
    '</td></tr></table>' +
    '</td></tr>' +

    // Texte d'accueil
    '<tr><td style="padding:24px 28px 8px 28px;color:' + encre + ';font-size:15px;line-height:1.5;">' +
    'Bonjour ' + echapperHtml(commande.prenom) + ',<br><br>Merci pour votre commande de saucissons ! Voici le r&eacute;capitulatif.' +
    '</td></tr>' +

    // Détail et totaux
    '<tr><td style="padding:8px 28px;font-size:15px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + lignesDetail + lignesTotaux +
    '<tr><td style="padding:12px 0 4px 0;border-top:2px solid ' + encre + ';color:' + encre + ';font-weight:bold;font-size:17px;">Total &agrave; payer</td>' +
    '<td style="padding:12px 0 4px 0;border-top:2px solid ' + encre + ';color:' + encre + ';font-weight:bold;font-size:17px;text-align:right;white-space:nowrap;">' + formaterEuros(m.total) + '</td></tr>' +
    '</table></td></tr>' +

    // Patrouille et retrait
    '<tr><td style="padding:16px 28px 8px 28px;font-size:14px;line-height:1.5;color:' + encre + ';">' +
    '<strong>Patrouille soutenue :</strong> ' + echapperHtml(commande.patrouille) + '<br>' +
    '<strong>Retrait :</strong> ' + echapperHtml(commande.retrait) +
    '</td></tr>' +

    // Bloc de virement
    '<tr><td style="padding:16px 28px 8px 28px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + fond + ';border:1px solid ' + trait + ';border-radius:10px;"><tr><td style="padding:16px 18px;font-size:14px;">' +
    '<div style="font-weight:bold;color:' + vert + ';font-size:15px;margin-bottom:8px;">Pour valider votre commande : virement</div>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">' +
    ligneVirement("Compte", echapperHtml(IBAN)) +
    ligneVirement("B&eacute;n&eacute;ficiaire", echapperHtml(TITULAIRE)) +
    ligneVirement("Montant", formaterEuros(m.total)) +
    ligneVirement("Communication", echapperHtml(commande.communication)) +
    '</table></td></tr></table></td></tr>' +

    // Avertissement
    '<tr><td style="padding:12px 28px 4px 28px;font-size:13px;line-height:1.5;color:#b3261e;">' +
    'Votre commande n&rsquo;est valid&eacute;e qu&rsquo;&agrave; r&eacute;ception du paiement. Sans paiement avant le ' + formaterDate(DATE_LIMITE_ISO) + ', elle sera annul&eacute;e.' +
    '</td></tr>' +

    // Pied
    '<tr><td style="padding:16px 28px 28px 28px;font-size:13px;line-height:1.5;color:' + discret + ';">' +
    'Une question ? R&eacute;pondez &agrave; ce mail ou &eacute;crivez &agrave; ' + echapperHtml(EMAIL_CONTACT) + '.<br><br>' +
    'Merci pour votre soutien !<br><strong style="color:' + encre + ';">' + echapperHtml(NOM_EXPEDITEUR) + '</strong>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>';
}

/*
 * @brief Envoie le mail de confirmation au client et note le résultat ("oui" ou le message d'erreur) dans la colonne "Mail envoyé" du Sheet. Renvoie true si le mail est parti.
 * @param commande Commande vérifiée.
 * @param feuille Onglet Commandes.
 * @param numeroDeLigne Ligne de la commande dans l'onglet.
 */
function envoyerMail(commande, feuille, numeroDeLigne) {
  const colonnes = positionsColonnes();

  try {
    MailApp.sendEmail({
      to: commande.email,
      subject: "Votre commande de saucissons n° " + commande.numeroTexte + " : paiement à effectuer",
      body: construireTexteMail(commande),
      htmlBody: construireHtmlMail(commande),
      name: NOM_EXPEDITEUR,
      replyTo: EMAIL_CONTACT
    });
    feuille.getRange(numeroDeLigne, colonnes.mail).setValue("oui");
    return true;
  } catch (erreur) {
    console.error("Mail non envoyé pour la commande " + commande.numeroTexte + " : " + erreur);
    feuille.getRange(numeroDeLigne, colonnes.mail).setValue("ÉCHEC : " + erreur.message);
    return false;
  }
}

/*
 * @brief Prépare la réponse envoyée à la page après une commande réussie. Seules les lignes commandées sont incluses ; tous les montants sont en centimes.
 * @param commande Commande vérifiée et enregistrée.
 * @param mailEnvoye true si le mail de confirmation est parti.
 */
function construireReponse(commande, mailEnvoye) {
  const lignes = [];
  for (let i = 0; i < SAUCISSONS.length; i++) {
    if (commande.quantites[i] > 0) {
      lignes.push({
        nom: SAUCISSONS[i].nom,
        quantite: commande.quantites[i],
        prixUnitaire: SAUCISSONS[i].prixCentimes,
        totalLigne: commande.quantites[i] * SAUCISSONS[i].prixCentimes
      });
    }
  }

  return {
    numero: commande.numeroTexte,
    prenom: commande.prenom,
    nom: commande.nom,
    email: commande.email,
    patrouille: commande.patrouille,
    retrait: commande.retrait,
    lignes: lignes,
    nombreTotal: commande.montants.nombreTotal,
    sousTotal: commande.montants.sousTotal,
    reduction: commande.montants.reduction,
    total: commande.montants.total,
    communication: commande.communication,
    iban: IBAN,
    titulaire: TITULAIRE,
    dateLimite: formaterDate(DATE_LIMITE_ISO),
    mailEnvoye: mailEnvoye
  };
}


/* ============================================================
   6. ONGLET "SYNTHÈSE" (à créer UNE fois à la main)
   ============================================================ */

/*
 * @brief Transforme un numéro de colonne en lettre(s) comme dans Google Sheets (1 donne "A", 27 donne "AA").
 * @param numero Numéro de colonne, à partir de 1.
 */
function lettreDeColonne(numero) {
  let lettre = "";
  while (numero > 0) {
    const reste = (numero - 1) % 26;
    lettre = String.fromCharCode(65 + reste) + lettre;
    numero = Math.floor((numero - 1) / 26);
  }
  return lettre;
}

/*
 * @brief Crée (ou recrée) l'onglet Synthèse avec des formules : quantités à commander au fournisseur, coût d'achat, marge et parts par patrouille, commandes non payées. À lancer à la main depuis l'éditeur Apps Script ; sert aussi à autoriser le script la première fois.
 */
function creerFeuilleSynthese() {
  const classeur = SpreadsheetApp.getActiveSpreadsheet();
  ouvrirFeuilleCommandes();   // s'assure que l'onglet Commandes existe avec ses titres

  let synthese = classeur.getSheetByName(NOM_FEUILLE_SYNTHESE);
  if (synthese !== null) {
    classeur.deleteSheet(synthese);
  }
  synthese = classeur.insertSheet(NOM_FEUILLE_SYNTHESE);

  const c = positionsColonnes();
  const commandes = NOM_FEUILLE_COMMANDES;
  const colPaye = commandes + "!" + lettreDeColonne(c.paye) + "2:" + lettreDeColonne(c.paye);
  const colPatrouille = commandes + "!" + lettreDeColonne(c.patrouille) + "2:" + lettreDeColonne(c.patrouille);
  const colNombre = commandes + "!" + lettreDeColonne(c.nombre) + "2:" + lettreDeColonne(c.nombre);
  const colTotal = commandes + "!" + lettreDeColonne(c.total) + "2:" + lettreDeColonne(c.total);

  // ---- Tableau 1 : saucissons (lignes 2 à n+1) ----
  synthese.getRange(1, 1, 1, 5).setValues([[
    "Saucisson", "Quantité commandée (toutes commandes)", "Quantité payée", "Prix d'achat (€)", "Coût d'achat des commandes payées (€)"
  ]]);

  for (let i = 0; i < SAUCISSONS.length; i++) {
    const ligne = i + 2;
    const colSaucisson = commandes + "!" + lettreDeColonne(c.premiereSaucisson + i) + "2:" + lettreDeColonne(c.premiereSaucisson + i);

    synthese.getRange(ligne, 1).setValue(SAUCISSONS[i].nom);
    synthese.getRange(ligne, 2).setFormula("=SUM(" + colSaucisson + ")");
    synthese.getRange(ligne, 3).setFormula("=SUMIFS(" + colSaucisson + "," + colPaye + ",TRUE)");
    synthese.getRange(ligne, 4).setValue(SAUCISSONS[i].prixAchatCentimes / 100);
    synthese.getRange(ligne, 5).setFormula("=C" + ligne + "*D" + ligne);
  }
  const ligneTotal1 = SAUCISSONS.length + 2;
  synthese.getRange(ligneTotal1, 1).setValue("TOTAL");
  synthese.getRange(ligneTotal1, 2).setFormula("=SUM(B2:B" + (ligneTotal1 - 1) + ")");
  synthese.getRange(ligneTotal1, 3).setFormula("=SUM(C2:C" + (ligneTotal1 - 1) + ")");
  synthese.getRange(ligneTotal1, 5).setFormula("=SUM(E2:E" + (ligneTotal1 - 1) + ")");

  // ---- Tableau 2 : patrouilles ----
  const ligneTitres2 = ligneTotal1 + 3;
  synthese.getRange(ligneTitres2, 1, 1, 8).setValues([[
    "Patrouille", "Commandes payées", "Saucissons payés", "Chiffre d'affaires payé (€)",
    "Coût d'achat (€)", "Marge (€)", "Part de la patrouille (€)", "Part de la troupe (€)"
  ]]);

  for (let p = 0; p < PATROUILLES.length; p++) {
    const ligne = ligneTitres2 + 1 + p;
    const nomEntreGuillemets = "\"" + PATROUILLES[p] + "\"";

    // Coût d'achat = somme sur chaque saucisson de (quantité payée de cette patrouille x prix d'achat).
    let formuleCout = "=0";
    for (let i = 0; i < SAUCISSONS.length; i++) {
      const colSaucisson = commandes + "!" + lettreDeColonne(c.premiereSaucisson + i) + "2:" + lettreDeColonne(c.premiereSaucisson + i);
      formuleCout = formuleCout + "+SUMIFS(" + colSaucisson + "," + colPatrouille + "," + nomEntreGuillemets + "," + colPaye + ",TRUE)*D" + (i + 2);
    }

    synthese.getRange(ligne, 1).setValue(PATROUILLES[p]);
    synthese.getRange(ligne, 2).setFormula("=COUNTIFS(" + colPatrouille + "," + nomEntreGuillemets + "," + colPaye + ",TRUE)");
    synthese.getRange(ligne, 3).setFormula("=SUMIFS(" + colNombre + "," + colPatrouille + "," + nomEntreGuillemets + "," + colPaye + ",TRUE)");
    synthese.getRange(ligne, 4).setFormula("=SUMIFS(" + colTotal + "," + colPatrouille + "," + nomEntreGuillemets + "," + colPaye + ",TRUE)");
    synthese.getRange(ligne, 5).setFormula(formuleCout);
    synthese.getRange(ligne, 6).setFormula("=D" + ligne + "-E" + ligne);

    if (PATROUILLES[p] === CHOIX_TOUTE_LA_TROUPE) {
      synthese.getRange(ligne, 7).setFormula("=0");
    } else {
      synthese.getRange(ligne, 7).setFormula("=F" + ligne + "*" + PART_PATROUILLE_POURCENT + "/100");
    }
    synthese.getRange(ligne, 8).setFormula("=F" + ligne + "-G" + ligne);
  }

  const premiereLigne2 = ligneTitres2 + 1;
  const derniereLigne2 = ligneTitres2 + PATROUILLES.length;
  const ligneTotal2 = derniereLigne2 + 1;
  synthese.getRange(ligneTotal2, 1).setValue("TOTAL");
  for (let colonne = 2; colonne <= 8; colonne++) {
    const lettre = lettreDeColonne(colonne);
    synthese.getRange(ligneTotal2, colonne).setFormula("=SUM(" + lettre + premiereLigne2 + ":" + lettre + derniereLigne2 + ")");
  }

  // ---- Bloc 3 : commandes non payées ----
  const ligne3 = ligneTotal2 + 3;
  synthese.getRange(ligne3, 1).setValue("Commandes NON payées (à relancer)");
  synthese.getRange(ligne3, 2).setFormula("=COUNTIF(" + colPaye + ",FALSE)");
  synthese.getRange(ligne3 + 1, 1).setValue("Montant en attente de paiement (€)");
  synthese.getRange(ligne3 + 1, 2).setFormula("=SUMIFS(" + colTotal + "," + colPaye + ",FALSE)");

  // ---- Mise en forme ----
  synthese.getRange(1, 1, 1, 5).setFontWeight("bold");
  synthese.getRange(ligneTitres2, 1, 1, 8).setFontWeight("bold");
  synthese.getRange(ligneTotal1, 1, 1, 5).setFontWeight("bold");
  synthese.getRange(ligneTotal2, 1, 1, 8).setFontWeight("bold");
  synthese.getRange(ligne3, 1, 2, 1).setFontWeight("bold");
  synthese.getRange(2, 4, SAUCISSONS.length + 1, 2).setNumberFormat("0.00");
  synthese.getRange(premiereLigne2, 4, PATROUILLES.length + 1, 5).setNumberFormat("0.00");
  synthese.getRange(ligne3 + 1, 2).setNumberFormat("0.00");
  synthese.setColumnWidths(1, 8, 190);
}
