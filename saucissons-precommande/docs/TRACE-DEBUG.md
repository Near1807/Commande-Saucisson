> **Note de version** : les exemples chiffrés de ce guide (quantités, totaux, seuil de réduction à 6 saucissons) viennent d'une version antérieure de la configuration. La règle actuelle (seuil à 3 saucissons, réduction de 1/6) est définie dans `backend/Config.gs` et `site/config.js`. La mécanique décrite et les numéros de ligne de `app.js` restent valables.

# Suivre la page pas à pas, comme dans un débogueur

Ce document déroule **trois scénarios réels** en suivant l'ordre exact dans lequel le code s'exécute, avec les numéros de ligne, la pile d'appels et l'état à chaque étape :

- **A. L'ouverture de la page** : du HTML jusqu'à la page prête, en détaillant la construction d'une carte (celle du Pur Porc, le premier saucisson).
- **B. Un clic sur « + »** (premier Pur Porc) : de l'événement jusqu'au redessin de l'écran.
- **C. Le 6ᵉ saucisson** : la même chaîne, mais avec les autres branches des `if` (la réduction d'un sixième).
- **D. Le clic sur « Valider »** : l'enchaînement complet, y compris la pause pendant l'attente du serveur.

Les numéros de ligne correspondent aux fichiers de cette version (`app.js`, `index.html`). Si tu modifies un fichier, ils bougent.

**Vérifié** : j'ai fait tourner la page avec un espion qui note chaque appel de fonction. Les ordres d'appel indiqués plus bas sont ceux **mesurés**, pas reconstitués.

---

## 0. Comment lire une trace (3 notions)

**1. La pile d'appels.** Quand une fonction en appelle une autre, la première **s'arrête et attend**. L'autre s'exécute en entier, puis **« retourne »** (`↩`) : la première reprend à la ligne suivante. La pile est la liste des fonctions « ouvertes » à un instant donné, la plus récente en dernier :

```
demarrer                                   ← demarrer a appelé afficherSaucissons : elle attend
demarrer > afficherSaucissons              ← afficherSaucissons a appelé formaterEuros : elle attend
demarrer > afficherSaucissons > formaterEuros   ← c'est formaterEuros qui s'exécute en ce moment
```

Quand `formaterEuros` finit, la pile redevient `demarrer > afficherSaucissons`, et le code reprend juste après l'appel.

**2. Le navigateur.** Quand la pile est vide, personne n'exécute rien : c'est le **NAVIGATEUR** qui attend un événement. Il est le seul à lancer une chaîne d'appels, soit au chargement, soit sur un événement (clic).

**3. Les « post-its ».** `addEventListener("click", fonction)` ne **lance pas** la fonction : il la colle comme un post-it sur le bouton. Le navigateur ne l'exécutera que si quelqu'un clique.

Dans chaque étape : 📍 = où on est, **Pile** = fonctions ouvertes, **Après** = ce qui a changé (état et écran).

---

# A. L'ouverture de la page

### A1. 📍 `index.html` (lu de haut en bas)

Le navigateur lit le HTML et fabrique la page. Rien n'est calculé : il affiche ce qui est écrit, y compris les « trous » :

```html
<strong id="regle-reduction-titre"></strong>            (ligne 53 : vide)
<div id="liste-saucissons" class="liste"></div>         (ligne 92 : conteneur vide)
<small id="barre-info">Aucun saucisson</small>          (ligne 162 : valeur par défaut)
<strong id="barre-total">0,00 €</strong>                (ligne 163 : valeur par défaut)
<section id="confirmation" ... hidden>                  (ligne 122 : cachée)
```

**Après (écran)** : un squelette de page, sans aucun saucisson, avec des trous.

### A2. 📍 `index.html:169` → `config.js`

```html
<script src="config.js"></script>
```

Le navigateur charge `config.js` et l'exécute : `const CONFIG = { ... }` crée **un gros objet en mémoire**. Rien n'est affiché. **Après** : `CONFIG` existe (liste de saucissons, patrouilles, seuil de réduction…).

### A3. 📍 `index.html:170` → `app.js`, exécuté de haut en bas

```html
<script src="app.js"></script>
```

Le navigateur lit `app.js` ligne par ligne :

| Lignes | Ce qui se passe |
|---|---|
| 17 | `const quantites = {};` → l'état naît **vide** : `{}` |
| 20 | `let envoiEnCours = false;` |
| 31 à 525 | **Définitions de fonctions** (de `formaterEuros` jusqu'à `demarrer`) : le navigateur les mémorise sous leur nom. **Aucune ne s'exécute.** |
| 527 | `demarrer();` → **premier appel**. C'est lui qui lance tout. |

**Pile** : `demarrer`.

### A4. 📍 `app.js:514` dans `demarrer`

```js
if (CONFIG.urlBackend === "") {
  document.getElementById("banniere-test").hidden = false;
}
```

`urlBackend` vaut `""` → la condition est vraie → on trouve la bannière de test et on retire `hidden`. **Après (écran)** : la bannière de mode test apparaît tout en haut.

### A5. 📍 `app.js:518` → `afficherReglesDeLaVente` (lignes 68 à 79)

**Pile** : `demarrer > afficherReglesDeLaVente`.

```js
document.getElementById("regle-reduction-titre").textContent =
    "Réduction de " + CONFIG.reductionNumerateur + "/" + CONFIG.reductionDenominateur;   // ligne 69
```

On trouve le trou d'`id` `regle-reduction-titre` (celui de la ligne 53 du HTML), on y écrit « Réduction de 1/6 ». Les lignes 71 à 73 font pareil pour `regle-reduction-texte`.

```js
const emplacements = document.querySelectorAll(".date-limite");   // ligne 75
for (const emplacement of emplacements) {                          // ligne 76
  emplacement.textContent = CONFIG.dateLimiteTexte;                // ligne 77
}
```

`querySelectorAll` renvoie **les deux** éléments de classe `date-limite` ; la boucle fait deux tours, chacun écrit « 06/12/2026 ». **↩ retour** dans `demarrer`. **Après (écran)** : la règle de réduction et les deux dates sont remplies.

### A6. 📍 `app.js:519` → `afficherSaucissons` (lignes 84 à 159), le cœur de la construction

**Pile** : `demarrer > afficherSaucissons`.

```js
const liste = document.getElementById("liste-saucissons");   // ligne 85
for (const saucisson of CONFIG.saucissons) {                  // ligne 87
```

On retrouve le conteneur vide de la ligne 92 du HTML. La boucle fait **onze tours**, dans l'ordre de `config.js` : pur-porc, sanglier, fumé, piment-espelette, ail, cèpes, comté, noisette, noix, enrobage-poivre, enrobage-herbes. Les tours se ressemblent tous : **on suit le 1er, celui du Pur Porc**. À ce tour, la variable `saucisson` vaut `{ id: "pur-porc", nom: "Pur Porc", prixCentimes: 600, ... }`.

**Ligne 88** : `quantites[saucisson.id] = 0;` → ajoute la clé `pur-porc` à l'état.
**Après (état)** : `{ "pur-porc": 0 }` (les dix autres clés arriveront aux tours suivants).

**Lignes 90 à 92 : la carte, en mémoire**

```js
const carte = document.createElement("div");    // un <div> créé... nulle part encore
carte.className = "carte";                       // class="carte"
carte.id = "carte-" + saucisson.id;              // id="carte-pur-porc"
```

**Lignes 95 à 110 : le bloc de textes**

```js
const titre = document.createElement("h3");
titre.textContent = saucisson.nom;                          // "Pur Porc"
...
details.textContent = saucisson.poids + " · " + formaterEuros(saucisson.prixCentimes) + " pièce";   // ligne 106
```

À la ligne 106, **appel** de `formaterEuros(600)` : **Pile** `demarrer > afficherSaucissons > formaterEuros`. Elle renvoie `"6,00 €"`. **↩ retour** : la ligne 106 continue avec ce texte : `"170 g · 6,00 € pièce"`.

Lignes 108 à 110 : `textes.appendChild(...)` assemble titre, description et détails dans le bloc de textes. Toujours **en mémoire**.

**Lignes 113 à 119 : la colonne de droite et le compteur** (même mécanique). Ligne 118-119 : `setAttribute` écrit les attributs `role` et `aria-label` (pour les lecteurs d'écran).

**Lignes 121 à 128 : le bouton « − »**

```js
const boutonMoins = document.createElement("button");
boutonMoins.type = "button";
boutonMoins.id = "moins-" + saucisson.id;                       // id="moins-pur-porc"
boutonMoins.textContent = "−";
boutonMoins.setAttribute("aria-label", "Retirer un saucisson " + saucisson.nom);
boutonMoins.addEventListener("click", function () {              // ligne 126
  changerQuantite(saucisson.id, -1);                              // ligne 127
});
```

**Moment clé (ligne 126)** : cette fonction (lignes 126 à 128) **n'est pas exécutée maintenant**. Le navigateur la colle comme un post-it sur le bouton « − » du Pur Porc. Elle **se souvient** de la valeur de `saucisson` à ce tour (le Pur Porc) : c'est ce qui fait que ce bouton agira sur le Pur Porc, et pas sur le dernier saucisson de la boucle.

**Lignes 130 à 133 : l'affichage de la quantité**

```js
const valeur = document.createElement("output");
valeur.id = "quantite-" + saucisson.id;     // id="quantite-pur-porc" ← on le retrouvera plus tard par cet id
valeur.textContent = "0";
```

**Lignes 135 à 142 : le bouton « + »**, identique au « − » : `id="plus-pur-porc"`, et un post-it (lignes 140 à 142) qui appelle `changerQuantite("pur-porc", 1)`.

**Lignes 144 à 150 : assemblage et sous-total**

```js
compteur.appendChild(boutonMoins);
compteur.appendChild(valeur);
compteur.appendChild(boutonPlus);
...
sousTotal.id = "soustotal-" + saucisson.id;   // id="soustotal-pur-porc", vide pour l'instant
```

**Lignes 152 à 157 : on accroche**

```js
carte.appendChild(textes);
carte.appendChild(droite);
liste.appendChild(carte);       // ligne 157 : ← LA CARTE APPARAÎT À L'ÉCRAN
```

Avant la ligne 157, tout existait seulement en mémoire. **À la 157**, la carte est accrochée au conteneur qui est dans la page : **elle devient visible**.

La boucle repart pour les dix saucissons suivants. **↩ retour** dans `demarrer`.

**Après (écran)** : onze cartes de saucissons, avec « 0 » et des boutons « − » encore non grisés (ils seront grisés au premier dessin).
**Après (consignes)** : un post-it sur chacun des vingt-deux boutons +/−.

### A7. 📍 `app.js:520-521` → `afficherChoix` (deux fois)

**Pile** : `demarrer > afficherChoix`. Même mécanique que A6 (`createElement`, `appendChild`) pour fabriquer les boutons radio des patrouilles, puis ceux du retrait. **↩ retour** à chaque fois. **Après (écran)** : les choix de patrouille et de retrait apparaissent.

### A8. 📍 `app.js:522` → `mettreAJourAffichage` (premier dessin)

Même fonction que celle détaillée en B. Comme toutes les quantités valent 0 : chaque carte reçoit « 0 », les sous-totaux sont vides, les boutons « − » sont grisés, `calculerMontants` renvoie des zéros, le message est « Aucun saucisson », le prix barré est vide et le total « 0,00 € ».

### A9. 📍 `app.js:524`

```js
document.getElementById("bouton-valider").addEventListener("click", validerCommande);
```

Un dernier post-it, sur « Valider ». **Attention à la forme** : `validerCommande` **sans parenthèses** : on donne la fonction elle-même au navigateur. Avec des parenthèses (`validerCommande()`), on l'**exécuterait immédiatement**, ce qui n'est pas voulu.

### A10. 📍 `app.js:525` puis `527`

`demarrer` finit. **↩ retour** : le script `app.js` est terminé. **Pile : vide.**

```
ÉTAT À LA FIN DU CHARGEMENT
  quantites     = { pur-porc:0, sanglier:0, fumé:0, … (onze clés, toutes à 0) }
  envoiEnCours  = false
  écran         = bannière, règles remplies, 11 cartes, choix, barre « Aucun saucisson · 0,00 € »
  post-its      = 22 sur les boutons +/−, 1 sur « Valider »
  le navigateur ATTEND
```

**Ordre mesuré** : `demarrer > afficherReglesDeLaVente > afficherSaucissons > (11 × formaterEuros) > afficherChoix > afficherChoix > mettreAJourAffichage > calculerMontants > formaterEuros`.

---

# B. Le clic sur « + » du Pur Porc (premier saucisson)

### B1. NAVIGATEUR

Le visiteur clique sur le « + » de la carte du Pur Porc. Le navigateur identifie l'élément cliqué (`id="plus-pur-porc"`), regarde s'il porte un post-it, trouve celui des lignes 140 à 142, et **l'appelle**.

**Pile** : `fonction anonyme (l.140)`.

### B2. 📍 `app.js:141`

```js
changerQuantite(saucisson.id, 1);
```

La fonction anonyme se souvient que `saucisson` désignait le Pur Porc. Elle appelle `changerQuantite("pur-porc", 1)`.

**Pile** : `fonction anonyme > changerQuantite`.

### B3. 📍 `app.js:199` à `206` dans `changerQuantite`

```js
let nouvelle = quantites[id] + difference;     // 199 : 0 + 1 = 1
if (nouvelle < 0) { ... }                       // 200 : 1 < 0 ? non, on saute
if (nouvelle > CONFIG.quantiteMax) { ... }      // 203 : 1 > 20 ? non, on saute
quantites[id] = nouvelle;                       // 206 : quantites["pur-porc"] = 1
```

**Après (état)** : `quantites["pur-porc"] = 1`.
**Après (écran)** : **rien n'a changé**. L'état est modifié, mais personne n'a encore redessiné. C'est exactement ce que tu as vu avec `quantites["pur-porc"] = 9` dans la console.

### B4. 📍 `app.js:207`

```js
mettreAJourAffichage();
```

**Pile** : `fonction anonyme > changerQuantite > mettreAJourAffichage`.

### B5. 📍 `app.js:214` à `229` : la boucle sur les saucissons

Pour **chaque** saucisson, dans l'ordre de `config.js` : pur-porc, sanglier, fumé… jusqu'à enrobage-herbes.

**Pour un saucisson à quantité 0 (par exemple le Sanglier, 2ᵉ tour)** :

```js
const quantite = quantites[saucisson.id];                                              // 215 : 0
document.getElementById("quantite-" + saucisson.id).textContent = String(quantite);   // 217 : écrit "0"
if (quantite > 0) { ... } else {
  document.getElementById("soustotal-" + saucisson.id).textContent = "";              // 223 : vide
}
document.getElementById("carte-" + saucisson.id).classList.toggle("choisie", quantite > 0);   // 226 : false → pas de classe
document.getElementById("moins-" + saucisson.id).disabled = (quantite === 0);          // 227 : true → bouton « − » grisé
document.getElementById("plus-" + saucisson.id).disabled = (quantite === CONFIG.quantiteMax);   // 228 : false
```

**Pour le Pur Porc (1ᵉʳ tour, quantité 1)**, les mêmes lignes ne donnent pas les mêmes résultats :

- **217** : le texte de `quantite-pur-porc` devient `"1"`. **L'écran affiche 1.**
- **219** : `1 > 0` est vrai → lignes 220 et 221 : on appelle `formaterEuros` **deux fois** (`formaterEuros(600)` et `formaterEuros(1 * 600)`). **Pile** `… > mettreAJourAffichage > formaterEuros`, puis ↩. Le sous-total devient `"1 × 6,00 € = 6,00 €"`.
- **226** : `toggle("choisie", true)` → la carte reçoit la classe `choisie` ; le CSS dessine sa bordure rouge.
- **227** : `disabled = (1 === 0)` → faux → le bouton « − » du Pur Porc **devient actif**.

Puis les neuf autres saucissons : comme le Sanglier (rien à afficher).

### B6. 📍 `app.js:231` → `calculerMontants` (lignes 38 à 58)

**Pile** : `fonction anonyme > changerQuantite > mettreAJourAffichage > calculerMontants`.

```js
let nombreTotal = 0;  let sousTotal = 0;                                    // 39-40
for (const saucisson of CONFIG.saucissons) {                                 // 42
  nombreTotal = nombreTotal + quantites[saucisson.id];                       // 43
  sousTotal = sousTotal + quantites[saucisson.id] * saucisson.prixCentimes;  // 44
}
```

Onze tours : dix ajoutent 0, celui du Pur Porc ajoute 1 et 600. Résultat : `nombreTotal = 1`, `sousTotal = 600`.

```js
let reduction = 0;                                    // 47
if (nombreTotal >= CONFIG.reductionAPartirDe) { ... } // 48 : 1 >= 6 ? non, on saute
return { nombreTotal: 1, sousTotal: 600, reduction: 0, total: 600 };   // 52-57
```

**↩ retour** : `montants` reçoit cet objet (ligne 231).

### B7. 📍 `app.js:234` à `247` : le message de la barre

```js
let message;                                                   // 234
if (montants.nombreTotal === 0) { ... }                        // 235 : 1 === 0 ? non
else if (montants.nombreTotal < CONFIG.reductionAPartirDe) {   // 237 : 1 < 6 ? OUI → on entre
  const manquants = CONFIG.reductionAPartirDe - montants.nombreTotal;   // 238 : 6 - 1 = 5
  let motSaucisson = "saucissons";                             // 239
  if (montants.nombreTotal === 1) { motSaucisson = "saucisson"; }  // 240-241 : singulier
  message = montants.nombreTotal + " " + motSaucisson + " · plus que " + manquants + " pour " + CONFIG.reductionNumerateur + "/" + CONFIG.reductionDenominateur + " de réduction";   // 243
}
document.getElementById("barre-info").textContent = message;   // 247
```

**Après (écran)** : la barre affiche « 1 saucisson · plus que 5 pour 1/6 de réduction ».

### B8. 📍 `app.js:250` à `255`

```js
if (montants.reduction > 0) { ... }                                  // 250 : 0 > 0 ? non
else { document.getElementById("barre-ancien").textContent = ""; }   // 253 : prix barré vidé
document.getElementById("barre-total").textContent = formaterEuros(montants.total);   // 255
```

`formaterEuros(600)` (**pile** + ↩) → « 6,00 € ». **Après (écran)** : total de la barre = « 6,00 € ».

### B9. Les retours en cascade

`mettreAJourAffichage` finit (ligne 256) **↩** `changerQuantite` finit (ligne 208) **↩** la fonction anonyme finit **↩** **NAVIGATEUR**. **Pile : vide.** Le navigateur repeint l'écran avec **toutes** les modifications d'un coup, puis attend le prochain événement.

```
ÉTAT APRÈS LE CLIC
  quantites     = { pur-porc:1, sanglier:0, fumé:0, … (les dix autres à 0) }
  écran, carte Pur Porc : "1", sous-total "1 × 6,00 € = 6,00 €", bordure rouge, « − » actif
  écran, barre : « 1 saucisson · plus que 5 pour 1/6 de réduction », total 6,00 €
```

**Ordre mesuré** : `changerQuantite > mettreAJourAffichage > formaterEuros > formaterEuros > calculerMontants > formaterEuros`.

---

# C. Le 6ᵉ saucisson : la même chaîne, d'autres branches

Départ : 5 Pur Porc déjà choisis (barre : « 5 saucissons · plus que 1 pour 1/6 de réduction », total 30,00 €). Le visiteur clique sur le « + » du **Sanglier**.

Les étapes B1 à B5 sont identiques, avec `id = "sanglier"` : le post-it de ce bouton appelle `changerQuantite("sanglier", 1)`, `quantites.sanglier` passe à 1, puis `mettreAJourAffichage` redessine tout. À B5, deux cartes ont maintenant une quantité (Pur Porc et Sanglier), d'où **quatre** appels à `formaterEuros` pour les sous-totaux au lieu de deux.

**Ce qui change commence à `calculerMontants`** :

```js
// après la boucle : nombreTotal = 6, sousTotal = 3600 (5 × 600 + 1 × 600)
if (nombreTotal >= CONFIG.reductionAPartirDe) {                          // 48 : 6 >= 6 ? OUI, on entre
  reduction = Math.round(sousTotal * CONFIG.reductionNumerateur / CONFIG.reductionDenominateur);    // 49 : round(3600 × 1 / 6) = 600
}
return { nombreTotal: 6, sousTotal: 3600, reduction: 600, total: 3000 };
```

**Retour dans `mettreAJourAffichage`** :

```js
if (montants.nombreTotal === 0) { ... }                          // 235 : non
else if (montants.nombreTotal < CONFIG.reductionAPartirDe) {...} // 237 : 6 < 6 ? NON, on saute
else {
  message = montants.nombreTotal + " saucissons · réduction de " + CONFIG.reductionNumerateur + "/" + CONFIG.reductionDenominateur + " appliquée";   // 245
}
...
if (montants.reduction > 0) {                                                        // 250 : 600 > 0 ? OUI
  document.getElementById("barre-ancien").textContent = formaterEuros(montants.sousTotal);   // 251 : "36,00 €"
}
document.getElementById("barre-total").textContent = formaterEuros(montants.total);   // 255 : "30,00 €"
```

**Après (écran)** : « 6 saucissons · réduction de 1/6 appliquée », prix barré **36,00 €**, total **30,00 €**. (Avec des saucissons au même prix, le 6ᵉ est donc offert : 5 saucissons ou 6 saucissons, le total est le même.)

**Ce que ça montre** : la fonction est la même, ce sont les `if` qui choisissent quelles lignes s'exécutent. **Aucun élément n'est créé ni supprimé** : `<s id="barre-ancien">` existait déjà dans le HTML (ligne 163), vide ; il reçoit simplement un texte, et le CSS le barre.

**Ordre mesuré** : `changerQuantite > mettreAJourAffichage > formaterEuros ×4 > calculerMontants > formaterEuros ×2`.

---

# D. Le clic sur « Valider »

Le visiteur a rempli le formulaire et clique. Le navigateur trouve le post-it de la ligne 524 et appelle `validerCommande`.

**Pile** : `validerCommande`.

| 📍 Ligne | Ce qui se passe |
|---|---|
| 382 à 384 | `if (envoiEnCours) return;` : un envoi est-il déjà en cours ? Non : on continue. |
| 385 | `afficherErreur("")` : efface l'ancien message d'erreur. |
| 387 | `lireFormulaire()` : **pile** `validerCommande > lireFormulaire`. Elle lit les champs (`.value`), appelle `lireChoix` deux fois (patrouille, retrait) et `calculerMontants` pour `totalAttendu`. Elle renvoie le **colis**. ↩ |
| 388 | `verifierFormulaire(donnees)` : renvoie `""` si tout va bien, sinon le texte de la première erreur. ↩ |
| 389 à 392 | `if (erreur !== "")` : **chemin n° 1, le plus courant** (un champ oublié) : `afficherErreur(erreur)` affiche le message, puis `return` : **la fonction s'arrête ici, rien n'est envoyé**. Sinon, on continue. |
| 394 à 397 | On verrouille : `envoiEnCours = true`, bouton grisé, texte « Envoi en cours… ». |
| 399 | `modeTest = (CONFIG.urlBackend === "")`. |
| 401 | `try {` : tout ce qui suit est surveillé. |
| 404 à 405 | **Mode test** : `simulerReponseDuServeur(donnees)` renvoie aussitôt une fausse réponse. **Aucune pause**. |
| 409 | **Mode réel** : `await fetch(...)`. **C'est ici que la fonction se met en pause.** |
| 414 | `await retour.json()` : seconde pause, très courte (lecture de la réponse). |
| 417 à 421 | `if (reponse.ok)` : le serveur a accepté → `afficherConfirmation(reponse.commande)` ; sinon → `afficherErreur(reponse.erreur)`. |
| 422 à 427 | `catch` : s'exécute **seulement** si quelque chose a planté plus haut (réseau coupé, réponse illisible). |
| 428 à 432 | `finally` : s'exécute **dans tous les cas** : `envoiEnCours = false`, bouton réactivé. |

**La pause du mode réel, en détail (ligne 409)** :
1. `fetch` envoie la requête. La fonction `validerCommande` est **suspendue** : elle reste « ouverte », mais le navigateur reprend la main.
2. **Pile : vide.** La page est vivante : on peut défiler, cliquer ailleurs (le bouton « Valider » est grisé et `envoiEnCours` bloque un second envoi).
3. Pendant ce temps, Google exécute `doPost` dans `Code.gs` (vérifications, écriture dans le Sheet, mail).
4. Quand la réponse arrive, le navigateur **réveille** `validerCommande` **à la ligne 409**, qui continue à la ligne 414 (deuxième `await`), puis à la 417.

**Après `afficherConfirmation`** : le formulaire et la barre sont cachés, l'écran de fin est affiché avec les montants **renvoyés par le serveur**.

**Ordre mesuré (mode test)** : `validerCommande > afficherErreur > lireFormulaire > lireChoix > lireChoix > calculerMontants > verifierFormulaire > calculerMontants > simulerReponseDuServeur > calculerMontants > afficherConfirmation > formaterEuros > ajouterLigneRecap …`

---

# E. Ce que ces trois cas t'apprennent (et pourquoi ils suffisent)

Ces scénarios contiennent tous les mécanismes du fichier :

1. **L'ordre de chargement** : HTML, puis `config.js`, puis `app.js`, puis `demarrer()` (A).
2. **Construire des éléments** : `createElement`, `appendChild`, et le fait que l'écran ne change qu'à l'accrochage (A6). `afficherChoix` et les lignes du récapitulatif sont des variantes.
3. **Les post-its** : `addEventListener` n'exécute rien, il enregistre ; et la fonction se souvient de son contexte (A6, B2).
4. **État puis redessin** : on change `quantites`, puis on appelle le redessin (B3, B4).
5. **Les branches** : les `if` décident quelles lignes écrivent quoi (C).
6. **La pile et les retours** : chaque fonction attend celle qu'elle appelle (partout).
7. **L'asynchrone** : la pause de `await` (D).
8. **Trouver par id** : le lien entre ce qui a été construit (A6) et ce qui est mis à jour (B5).

Les autres fonctions sont des variantes : `lireFormulaire` lit (`.value`), `verifierFormulaire` enchaîne des `if`, `afficherConfirmation` écrit et accroche. Et `Code.gs` a la même forme : un point d'entrée (`doPost`) qui appelle une chaîne de fonctions, chacune attendant l'autre.

---

# F. Refaire cette trace toi-même avec le vrai débogueur

Ton navigateur a un débogueur intégré qui fait exactement ça : il s'arrête sur une ligne et te laisse avancer pas à pas, en montrant la pile et les variables.

**Préparer** : ouvre `site/index.html` dans Chrome, F12, onglet **Sources**, puis clique sur `app.js` dans la liste des fichiers.

**Pour la trace A (ouverture)**
1. Clique sur le **numéro de la ligne 527** (`demarrer();`) : un marqueur bleu apparaît (c'est un point d'arrêt).
2. Recharge la page (F5) : l'exécution **s'arrête** sur cette ligne.
3. Appuie sur **F11** (« Step into », entrer dans la fonction) : tu entres dans `demarrer`. Continue avec F11 pour descendre dans chaque fonction, ou **F10** (« Step over ») pour exécuter la ligne sans y entrer, ou **Maj+F11** (« Step out ») pour finir la fonction en cours.
4. À chaque pas, regarde à droite :
   - **Call Stack** : la pile d'appels, comme dans ce document.
   - **Scope** : les variables locales et globales (cherche `quantites`, `saucisson`, `carte`).
   - **Watch** : clique « + » et tape `quantites` pour la suivre en permanence.
5. Fais pareil à la ligne 157 (`liste.appendChild(carte)`) : regarde l'écran **avant** et **après** l'exécution de cette ligne : c'est le moment où la carte apparaît.

**Pour la trace B (clic)**
1. Retire le point d'arrêt de la ligne 527 (re-clique dessus), puis pose-en un à la **ligne 199** (`let nouvelle = …`).
2. Clique sur un « + » : l'exécution s'arrête. La Call Stack montre `changerQuantite` appelée par la fonction anonyme.
3. F10 ligne par ligne : regarde `nouvelle` changer dans Scope, et `quantites` dans Watch. À la ligne 206, l'état change mais l'écran **non** ; à la fin de `mettreAJourAffichage`, l'écran change.

**Pour la trace D (pause de l'await)** : pose un point d'arrêt à la ligne 409 en mode réel ; tu verras la fonction s'arrêter, puis reprendre à la réponse du serveur.
