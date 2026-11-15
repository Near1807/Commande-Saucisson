/*
 * app.js : le comportement de la page.
 *
 * Ce que fait ce fichier, dans l'ordre :
 *   1. Construit la liste des saucissons, des patrouilles et des modes de retrait depuis config.js.
 *   2. Met à jour le total en direct quand on change une quantité.
 *   3. Au clic sur "Valider", vérifie le formulaire puis envoie la commande au serveur.
 *   4. Affiche la réponse du serveur : récapitulatif et demande de virement.
 *
 * Le total affiché ici est une aide pour le client. Le montant réellement dû est
 * toujours celui recalculé par le serveur et renvoyé dans la réponse.
 *
 * Aucune bibliothèque, aucun framework : uniquement du JavaScript standard.
 */

/* Quantité choisie pour chaque saucisson. Clé = id du saucisson, valeur = quantité. */
const quantites = {};

/* Vrai pendant l'envoi d'une commande, pour empêcher un double clic. */
let envoiEnCours = false;


/* ============================================================
   1. OUTILS D'AFFICHAGE ET DE CALCUL
   ============================================================ */

/*
 * @brief Met un montant en centimes sous la forme "12,50 €".
 * @param centimes Montant en centimes.
 */
function formaterEuros(centimes) {
  return (centimes / 100).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
}

/*
 * @brief Calcule le nombre de saucissons, le sous-total, la réduction et le total de la commande en cours (montants en centimes). La réduction s'applique dès que le nombre total de saucissons atteint le seuil de config.js.
 */
function calculerMontants() {
  let nombreTotal = 0;
  let sousTotal = 0;

  for (const saucisson of CONFIG.saucissons) {
    nombreTotal = nombreTotal + quantites[saucisson.id];
    sousTotal = sousTotal + quantites[saucisson.id] * saucisson.prixCentimes;
  }

  let reduction = 0;
  if (nombreTotal >= CONFIG.reductionAPartirDe) {
    reduction = Math.round(sousTotal * CONFIG.reductionPourcent / 100);
  }

  return {
    nombreTotal: nombreTotal,
    sousTotal: sousTotal,
    reduction: reduction,
    total: sousTotal - reduction
  };
}


/* ============================================================
   2. CONSTRUCTION DE LA PAGE
   ============================================================ */

/*
 * @brief Remplit les textes qui dépendent de config.js : la règle de réduction et la date limite.
 */
function afficherReglesDeLaVente() {
  document.getElementById("regle-reduction-titre").textContent =
    "Réduction de " + CONFIG.reductionPourcent + " %";
  document.getElementById("regle-reduction-texte").textContent =
    "Dès " + CONFIG.reductionAPartirDe + " saucissons commandés (toutes sortes confondues), " +
    CONFIG.reductionPourcent + " % sont déduits du total.";

  const emplacements = document.querySelectorAll(".date-limite");
  for (const emplacement of emplacements) {
    emplacement.textContent = CONFIG.dateLimiteTexte;
  }
}

/*
 * @brief Construit une carte par saucisson (nom, description, prix, boutons moins/plus) dans la section "Vos saucissons".
 */
function afficherSaucissons() {
  const liste = document.getElementById("liste-saucissons");

  for (const saucisson of CONFIG.saucissons) {
    quantites[saucisson.id] = 0;

    const carte = document.createElement("div");
    carte.className = "carte";
    carte.id = "carte-" + saucisson.id;

    // Colonne de gauche : textes
    const textes = document.createElement("div");

    const titre = document.createElement("h3");
    titre.textContent = saucisson.nom;

    const description = document.createElement("p");
    description.className = "description";
    description.textContent = saucisson.description;

    const details = document.createElement("p");
    details.className = "details";
    details.textContent = saucisson.poids + " · " + formaterEuros(saucisson.prixCentimes) + " pièce";

    textes.appendChild(titre);
    textes.appendChild(description);
    textes.appendChild(details);

    // Colonne de droite : compteur et sous-total de la ligne
    const droite = document.createElement("div");
    droite.className = "carte-quantite";

    const compteur = document.createElement("div");
    compteur.className = "compteur";
    compteur.setAttribute("role", "group");
    compteur.setAttribute("aria-label", "Quantité de saucisson " + saucisson.nom);

    const boutonMoins = document.createElement("button");
    boutonMoins.type = "button";
    boutonMoins.id = "moins-" + saucisson.id;
    boutonMoins.textContent = "−";
    boutonMoins.setAttribute("aria-label", "Retirer un saucisson " + saucisson.nom);
    boutonMoins.addEventListener("click", function () {
      changerQuantite(saucisson.id, -1);
    });

    const valeur = document.createElement("output");
    valeur.id = "quantite-" + saucisson.id;
    valeur.setAttribute("aria-live", "polite");
    valeur.textContent = "0";

    const boutonPlus = document.createElement("button");
    boutonPlus.type = "button";
    boutonPlus.id = "plus-" + saucisson.id;
    boutonPlus.textContent = "+";
    boutonPlus.setAttribute("aria-label", "Ajouter un saucisson " + saucisson.nom);
    boutonPlus.addEventListener("click", function () {
      changerQuantite(saucisson.id, 1);
    });

    compteur.appendChild(boutonMoins);
    compteur.appendChild(valeur);
    compteur.appendChild(boutonPlus);

    const sousTotal = document.createElement("span");
    sousTotal.className = "sous-total";
    sousTotal.id = "soustotal-" + saucisson.id;

    droite.appendChild(compteur);
    droite.appendChild(sousTotal);

    carte.appendChild(textes);
    carte.appendChild(droite);
    liste.appendChild(carte);
  }
}

/*
 * @brief Construit une liste de boutons radio (un seul choix possible) dans un conteneur.
 * @param idConteneur Identifiant de l'élément HTML qui recevra les choix.
 * @param nomGroupe Nom du groupe de boutons radio (sert à les lire ensuite).
 * @param valeurs Textes des choix proposés.
 */
function afficherChoix(idConteneur, nomGroupe, valeurs) {
  const conteneur = document.getElementById(idConteneur);

  for (const valeur of valeurs) {
    const etiquette = document.createElement("label");
    etiquette.className = "choix";

    const bouton = document.createElement("input");
    bouton.type = "radio";
    bouton.name = nomGroupe;
    bouton.value = valeur;

    const texte = document.createElement("span");
    texte.textContent = valeur;

    etiquette.appendChild(bouton);
    etiquette.appendChild(texte);
    conteneur.appendChild(etiquette);
  }
}


/* ============================================================
   3. MISE À JOUR EN DIRECT
   ============================================================ */

/*
 * @brief Ajoute ou retire des saucissons d'une sorte, en restant entre 0 et la quantité maximale, puis rafraîchit l'affichage.
 * @param id Identifiant du saucisson (par exemple "noix").
 * @param difference +1 pour en ajouter un, -1 pour en retirer un.
 */
function changerQuantite(id, difference) {
  let nouvelle = quantites[id] + difference;
  if (nouvelle < 0) {
    nouvelle = 0;
  }
  if (nouvelle > CONFIG.quantiteMax) {
    nouvelle = CONFIG.quantiteMax;
  }
  quantites[id] = nouvelle;
  mettreAJourAffichage();
}

/*
 * @brief Rafraîchit tout ce qui dépend des quantités : chaque carte, le message sur la réduction et le total dans la barre du bas.
 */
function mettreAJourAffichage() {
  for (const saucisson of CONFIG.saucissons) {
    const quantite = quantites[saucisson.id];

    document.getElementById("quantite-" + saucisson.id).textContent = String(quantite);

    if (quantite > 0) {
      document.getElementById("soustotal-" + saucisson.id).textContent =
        quantite + " × " + formaterEuros(saucisson.prixCentimes) + " = " + formaterEuros(quantite * saucisson.prixCentimes);
    } else {
      document.getElementById("soustotal-" + saucisson.id).textContent = "";
    }

    document.getElementById("carte-" + saucisson.id).classList.toggle("choisie", quantite > 0);
    document.getElementById("moins-" + saucisson.id).disabled = (quantite === 0);
    document.getElementById("plus-" + saucisson.id).disabled = (quantite === CONFIG.quantiteMax);
  }

  const montants = calculerMontants();

  // Message dans la barre : combien de saucissons, et où en est la réduction.
  let message;
  if (montants.nombreTotal === 0) {
    message = "Aucun saucisson";
  } else if (montants.nombreTotal < CONFIG.reductionAPartirDe) {
    const manquants = CONFIG.reductionAPartirDe - montants.nombreTotal;
    let motSaucisson = "saucissons";
    if (montants.nombreTotal === 1) {
      motSaucisson = "saucisson";
    }
    message = montants.nombreTotal + " " + motSaucisson + " · plus que " + manquants + " pour -" + CONFIG.reductionPourcent + " %";
  } else {
    message = montants.nombreTotal + " saucissons · réduction de " + CONFIG.reductionPourcent + " % appliquée";
  }
  document.getElementById("barre-info").textContent = message;

  // Ancien prix barré uniquement quand une réduction s'applique.
  if (montants.reduction > 0) {
    document.getElementById("barre-ancien").textContent = formaterEuros(montants.sousTotal);
  } else {
    document.getElementById("barre-ancien").textContent = "";
  }
  document.getElementById("barre-total").textContent = formaterEuros(montants.total);
}


/* ============================================================
   4. LECTURE ET VÉRIFICATION DU FORMULAIRE
   ============================================================ */

/*
 * @brief Renvoie le texte du bouton radio coché dans un groupe, ou "" si aucun n'est coché.
 * @param nomGroupe Nom du groupe de boutons radio.
 */
function lireChoix(nomGroupe) {
  const coche = document.querySelector('input[name="' + nomGroupe + '"]:checked');
  if (coche === null) {
    return "";
  }
  return coche.value;
}

/*
 * @brief Lit tous les champs du formulaire et prépare l'objet envoyé au serveur (avec le total calculé ici, que le serveur compare au sien).
 */
function lireFormulaire() {
  return {
    prenom: document.getElementById("prenom").value.trim(),
    nom: document.getElementById("nom").value.trim(),
    email: document.getElementById("email").value.trim(),
    telephone: document.getElementById("telephone").value.trim(),
    remarque: document.getElementById("remarque").value.trim(),
    patrouille: lireChoix("patrouille"),
    retrait: lireChoix("retrait"),
    consentement: document.getElementById("consentement").checked,
    site_web: document.getElementById("site_web").value,
    quantites: Object.assign({}, quantites),
    totalAttendu: calculerMontants().total
  };
}

/*
 * @brief Vérifie les données du formulaire. Renvoie un message d'erreur en français, ou "" si tout est bon. Le serveur refait les mêmes vérifications : celles-ci servent à guider le client.
 * @param donnees Objet produit par lireFormulaire.
 */
function verifierFormulaire(donnees) {
  if (donnees.prenom === "" || donnees.nom === "") {
    return "Indiquez votre prénom et votre nom (étape 1).";
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(donnees.email)) {
    return "Cette adresse e-mail semble incomplète (étape 1).";
  }
  if (donnees.telephone === "") {
    return "Indiquez votre numéro de téléphone (étape 1).";
  }
  if (calculerMontants().nombreTotal === 0) {
    return "Ajoutez au moins un saucisson (étape 2).";
  }
  if (donnees.patrouille === "") {
    return "Choisissez la patrouille à soutenir (étape 3).";
  }
  if (donnees.retrait === "") {
    return "Choisissez comment récupérer votre commande (étape 4).";
  }
  if (!donnees.consentement) {
    return "Cochez la case d'acceptation pour pouvoir envoyer la commande (étape 4).";
  }
  return "";
}

/*
 * @brief Affiche un message d'erreur sous le formulaire.
 * @param message Texte de l'erreur.
 */
function afficherErreur(message) {
  document.getElementById("erreur").textContent = message;
}


/* ============================================================
   5. ENVOI DE LA COMMANDE
   ============================================================ */

/*
 * @brief Simule la réponse du serveur en mode test (urlBackend vide), avec la même forme que la vraie réponse. Rien n'est envoyé ni enregistré.
 * @param donnees Objet produit par lireFormulaire.
 */
function simulerReponseDuServeur(donnees) {
  const montants = calculerMontants();
  const lignes = [];

  for (const saucisson of CONFIG.saucissons) {
    if (quantites[saucisson.id] > 0) {
      lignes.push({
        nom: saucisson.nom,
        quantite: quantites[saucisson.id],
        prixUnitaire: saucisson.prixCentimes,
        totalLigne: quantites[saucisson.id] * saucisson.prixCentimes
      });
    }
  }

  return {
    ok: true,
    commande: {
      numero: "000",
      prenom: donnees.prenom,
      nom: donnees.nom,
      email: donnees.email,
      patrouille: donnees.patrouille,
      retrait: donnees.retrait,
      lignes: lignes,
      nombreTotal: montants.nombreTotal,
      sousTotal: montants.sousTotal,
      reduction: montants.reduction,
      total: montants.total,
      communication: "SAUCISSONS 000 (EXEMPLE)",
      iban: "(mode test : IBAN fourni par le serveur)",
      titulaire: "(mode test)",
      dateLimite: CONFIG.dateLimiteTexte,
      mailEnvoye: false
    }
  };
}

/*
 * @brief Vérifie le formulaire, envoie la commande au serveur (ou la simule en mode test) et affiche le résultat. Appelée au clic sur "Valider ma commande".
 */
async function validerCommande() {
  if (envoiEnCours) {
    return;
  }
  afficherErreur("");

  const donnees = lireFormulaire();
  const erreur = verifierFormulaire(donnees);
  if (erreur !== "") {
    afficherErreur(erreur);
    return;
  }

  const bouton = document.getElementById("bouton-valider");
  envoiEnCours = true;
  bouton.disabled = true;
  bouton.textContent = "Envoi en cours…";

  const modeTest = (CONFIG.urlBackend === "");

  try {
    let reponse;

    if (modeTest) {
      reponse = simulerReponseDuServeur(donnees);
    } else {
      // Content-Type "text/plain" : évite une requête de vérification préalable que Google Apps Script ne gère pas.
      // Le serveur lit le contenu comme du JSON.
      const retour = await fetch(CONFIG.urlBackend, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(donnees)
      });
      reponse = await retour.json();
    }

    if (reponse.ok) {
      afficherConfirmation(reponse.commande);
    } else {
      afficherErreur(reponse.erreur);
    }
  } catch (erreurReseau) {
    afficherErreur(
      "Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez. " +
      "Si le problème continue, contactez " + CONFIG.contact + ". " +
      "Attention : ne renvoyez pas la commande avant d'avoir vérifié vos mails, elle a peut-être été enregistrée."
    );
  } finally {
    envoiEnCours = false;
    bouton.disabled = false;
    bouton.textContent = "Valider ma commande";
  }
}


/* ============================================================
   6. ÉCRAN DE CONFIRMATION
   ============================================================ */

/*
 * @brief Ajoute une ligne (libellé à gauche, montant à droite) dans la liste du récapitulatif.
 * @param liste Élément <ul> qui reçoit la ligne.
 * @param gauche Texte à gauche.
 * @param droite Texte à droite.
 * @param classe Classe CSS de la ligne ("" pour aucune).
 */
function ajouterLigneRecap(liste, gauche, droite, classe) {
  const ligne = document.createElement("li");
  if (classe !== "") {
    ligne.className = classe;
  }

  const texteGauche = document.createElement("span");
  texteGauche.textContent = gauche;
  const texteDroite = document.createElement("span");
  texteDroite.textContent = droite;

  ligne.appendChild(texteGauche);
  ligne.appendChild(texteDroite);
  liste.appendChild(ligne);
}

/*
 * @brief Remplace le formulaire par le récapitulatif de la commande et la demande de virement, à partir de la réponse du serveur. Les textes saisis par le client sont insérés avec textContent, jamais comme du HTML.
 * @param commande Objet "commande" de la réponse du serveur (montants en centimes).
 */
function afficherConfirmation(commande) {
  document.getElementById("conf-titre").textContent = "Commande de " + commande.prenom + " " + commande.nom;
  document.getElementById("conf-numero").textContent = "N° " + commande.numero;

  const liste = document.getElementById("conf-lignes");
  liste.textContent = "";
  for (const ligne of commande.lignes) {
    ajouterLigneRecap(liste, ligne.quantite + " × " + ligne.nom, formaterEuros(ligne.totalLigne), "");
  }
  if (commande.reduction > 0) {
    ajouterLigneRecap(liste, "Sous-total", formaterEuros(commande.sousTotal), "");
    ajouterLigneRecap(liste, "Réduction de " + CONFIG.reductionPourcent + " %", "-" + formaterEuros(commande.reduction), "reduction");
  }
  ajouterLigneRecap(liste, "Total à payer", formaterEuros(commande.total), "total");

  document.getElementById("conf-details").textContent =
    "Patrouille soutenue : " + commande.patrouille + ". Retrait : " + commande.retrait + ".";

  document.getElementById("conf-iban").textContent = commande.iban;
  document.getElementById("conf-titulaire").textContent = commande.titulaire;
  document.getElementById("conf-montant").textContent = formaterEuros(commande.total);
  document.getElementById("conf-communication").textContent = commande.communication;

  if (commande.mailEnvoye) {
    document.getElementById("conf-mail").textContent =
      "Un mail récapitulatif vient d'être envoyé à " + commande.email + ".";
  } else {
    document.getElementById("conf-mail").textContent =
      "Le mail récapitulatif n'a pas pu être envoyé : conservez bien les informations de paiement ci-dessus.";
  }

  // On cache le formulaire et la barre du bas : plus de double envoi possible.
  document.getElementById("formulaire").hidden = true;
  document.getElementById("barre").hidden = true;
  document.getElementById("confirmation").hidden = false;
  document.getElementById("confirmation").scrollIntoView({ behavior: "smooth", block: "start" });
}


/* ============================================================
   7. DÉMARRAGE
   ============================================================ */

/*
 * @brief Prépare la page au chargement : textes, listes de choix, affichage initial, bannière de mode test et bouton de validation.
 */
function demarrer() {
  if (CONFIG.urlBackend === "") {
    document.getElementById("banniere-test").hidden = false;
  }

  afficherReglesDeLaVente();
  afficherSaucissons();
  afficherChoix("choix-patrouille", "patrouille", CONFIG.patrouilles);
  afficherChoix("choix-retrait", "retrait", CONFIG.retraits);
  mettreAJourAffichage();

  document.getElementById("bouton-valider").addEventListener("click", validerCommande);
}

demarrer();
