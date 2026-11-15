> **Note de version** : les exemples chiffrés de ce guide (quantités, totaux, seuil de réduction à 6 saucissons) viennent d'une version antérieure de la configuration. La règle actuelle (seuil à 3 saucissons, réduction de 1/6) est définie dans `backend/Config.gs` et `site/config.js`. La mécanique décrite et les numéros de ligne de `app.js` restent valables.

# Lire `app.js` quand on vient de React

Ce guide est fait pour quelqu'un qui connaît React mais n'a jamais écrit une page « à nu ». Il répond à trois questions : **comment les valeurs arrivent à l'écran**, **ce que fait chaque outil du navigateur utilisé dans `app.js`**, et **comment relire le fichier sans se perdre**.

Comment l'utiliser :
- Lis les parties 1 à 3 d'un trait (10 minutes). Elles donnent le fil rouge.
- Garde la partie 4 (le dictionnaire) ouverte à côté de `app.js` : chaque fois qu'un mot est inconnu, il est là.
- La partie 5 déroule quatre passages clés ligne par ligne.
- La partie 7 est ta liste de vérifications avant le lancement.

---

## 1. Le changement de mentalité : React fait un travail que tu dois ici faire à la main

Avec React, tu **décris** ce que l'écran doit montrer en fonction de l'état, et React s'occupe de modifier la page. Sans React, **c'est toi qui donnes les ordres** : « trouve ce texte, remplace-le ». Rien de magique n'a été ajouté dans `app.js` : c'est ce que React fait en coulisses, mais rendu visible.

| Dans React | Dans `app.js` |
|---|---|
| JSX : `<div className="carte">` | `document.createElement("div")` puis `carte.className = "carte"` |
| `{saucisson.nom}` dans le JSX | `titre.textContent = saucisson.nom` |
| `useState` (l'état) | l'objet `quantites`, une simple variable |
| `setState` : React redessine tout seul | **tu appelles toi-même** `mettreAJourAffichage()` |
| `onClick={...}` | `addEventListener("click", ...)` |
| `liste.map(...)` qui produit des éléments | une boucle `for` qui crée et accroche des éléments |
| classe conditionnelle `className={x ? "choisie" : ""}` | `classList.toggle("choisie", x)` |
| `<input value={etat} onChange=...>` (champ contrôlé) | champ **non contrôlé** : on ne suit pas la saisie, on lit `.value` au moment d'envoyer |
| `useEffect(() => {...}, [])` au chargement | `demarrer()`, appelée à la dernière ligne du fichier |
| React ne modifie que ce qui a changé | `mettreAJourAffichage` réécrit **tous** les textes à chaque fois (peu coûteux ici, et plus simple à relire) |

La règle qui reste vraie dans les deux mondes : **l'état est la vérité, l'écran n'en est que le reflet**. Ici, l'état est `quantites` ; l'écran est redessiné depuis lui.

---

## 2. Le fil rouge : les « trous » du HTML et les 5 gestes

### Comment une valeur arrive à l'écran

Le HTML contient des **trous**, c'est-à-dire des éléments avec un `id`, que le JavaScript vient remplir. Exemple, dans `index.html` :

```html
<strong id="barre-total">0,00 €</strong>
```

Et dans `app.js` :

```js
document.getElementById("barre-total").textContent = formaterEuros(montants.total);
```

Cette ligne se lit : « **trouve** l'élément dont l'id est `barre-total`, **remplace son texte** par le total formaté ». C'est tout. Le lien entre le HTML et le JavaScript, c'est **l'id** : le même mot écrit aux deux endroits.

Il y a un deuxième cas : le HTML ne contient qu'un **conteneur vide**, et le JavaScript y **fabrique** du contenu. Exemple pour les saucissons :

```html
<div id="liste-saucissons" class="liste"></div>
```

Le JavaScript crée une carte par saucisson et les **accroche** dans ce conteneur. Les éléments créés n'apparaissent à l'écran qu'**au moment de l'accrochage** (`appendChild`). Avant, ils n'existent qu'en mémoire.

### Les 5 gestes

Presque chaque ligne de `app.js` appartient à l'un de ces cinq gestes (le reste est de la logique ordinaire : calculs, conditions, boucles).

1. **TROUVER** un élément : `document.getElementById("...")`.
2. **LIRE** ce qu'il contient : `.value`, `.checked`.
3. **ÉCRIRE** dedans ou le modifier : `.textContent = ...`, `.disabled = ...`, `.hidden = ...`, `classList.toggle`.
4. **CONSTRUIRE puis ACCROCHER** : `createElement`, puis `appendChild`.
5. **ÉCOUTER** : `addEventListener("click", ...)`.

Quand tu relis une fonction, demande-toi pour chaque ligne : *lequel des cinq gestes est-ce ?* Au bout de quelques fonctions, la lecture devient rapide.

---

## 3. Où chaque geste est utilisé dans le fichier

- `afficherReglesDeLaVente` : TROUVER + ÉCRIRE (remplit des textes dans des trous).
- `afficherSaucissons`, `afficherChoix` : CONSTRUIRE + ACCROCHER + ÉCOUTER (fabriquent des éléments).
- `changerQuantite` : logique pure (aucun geste, juste un calcul sur `quantites`).
- `mettreAJourAffichage` : TROUVER + ÉCRIRE, répété pour chaque saucisson.
- `lireChoix`, `lireFormulaire` : TROUVER + LIRE.
- `verifierFormulaire`, `calculerMontants` : logique pure.
- `afficherErreur` : TROUVER + ÉCRIRE.
- `validerCommande` : enchaîne tout, puis ENVOIE (`fetch`).
- `afficherConfirmation`, `ajouterLigneRecap` : TROUVER + ÉCRIRE, plus CONSTRUIRE + ACCROCHER pour les lignes du récapitulatif.
- `demarrer` : appelle les fonctions de construction, puis ÉCOUTE le bouton « Valider ».

**Ordre de lecture conseillé** (du plus important au plus décoratif) : `calculerMontants` → `mettreAJourAffichage` → `lireFormulaire` → `verifierFormulaire` → `validerCommande` → `afficherConfirmation` → en dernier les fonctions de construction (`afficherSaucissons`, `afficherChoix`), qui ne font que dessiner.

---

## 4. Le dictionnaire de tout ce qui est utilisé dans `app.js`

### Trouver des éléments

- **`document`** : l'objet qui représente la page entière. C'est le point de départ de toute recherche.
- **`document.getElementById("x")`** : renvoie **l'unique élément** dont l'id est `x`. (Un id est unique dans une page : on obtient donc UN élément, pas une liste.) Si l'id n'existe pas, on obtient `null`, et la ligne suivante plante : c'est pourquoi les ids doivent être écrits **exactement pareil** en HTML et en JS. C'est la source d'erreur la plus fréquente de ce style de code. *En React : l'équivalent approximatif d'un `ref`.*
- **`document.querySelector("sélecteur")`** : renvoie le **premier** élément qui correspond à un sélecteur CSS (le même langage que dans `style.css`), ou `null`. Dans notre code : `'input[name="patrouille"]:checked'` signifie « un `<input>` dont l'attribut `name` vaut `patrouille` **et** qui est coché ».
- **`document.querySelectorAll(".date-limite")`** : renvoie **tous** les éléments qui correspondent (une liste), qu'on parcourt avec une boucle. Utilisé pour la date limite, qui apparaît à deux endroits.

### Lire et écrire les propriétés d'un élément

Un élément a des **propriétés** qui reflètent ses attributs HTML. Les lire, c'est lire la page ; les modifier, c'est modifier la page.

- **`.textContent`** : le texte de l'élément. En lecture, on obtient son texte ; en écriture (`= "..."`), on **remplace** tout son contenu par ce texte. Le texte est toujours traité comme du **texte brut**, jamais comme du HTML : c'est la protection qui empêche un client de glisser du code dans son nom. `liste.textContent = ""` vide un élément.
- **`.value`** : le contenu **actuel** d'un champ de saisie (ce que la personne a tapé), ou la valeur d'un bouton radio.
- **`.checked`** : vrai/faux, pour une case à cocher ou un bouton radio.
- **`.disabled`** : vrai/faux ; un bouton `disabled` est grisé et inactif.
- **`.hidden`** : vrai/faux ; un élément `hidden` n'est pas affiché (grâce à la règle `[hidden]` du CSS).
- **`.className`** : le texte de l'attribut `class` (on dit `className` car `class` est un mot réservé en JavaScript, comme en React).
- **`.id`, `.type`, `.name`** : les attributs `id`, `type` et `name`, écrits depuis le code au lieu de l'être dans le HTML. `bouton.type = "button"` a exactement le même effet que `<button type="button">`.
- **`element.setAttribute("aria-label", "...")`** : écrit directement un attribut HTML, par son nom. Utilisé pour les attributs qui n'ont pas de propriété dédiée (ici `aria-label`, `role` et `aria-live`, qui servent aux lecteurs d'écran). `bouton.setAttribute("aria-label", "x")` revient à écrire `<button aria-label="x">`.
- **`element.classList.toggle("choisie", condition)`** : ajoute la classe `choisie` à l'élément si `condition` est vraie, la retire sinon. Le CSS fait ensuite le reste (la bordure rouge).

### Fabriquer des éléments et les accrocher

- **`document.createElement("div")`** : crée un nouvel élément `<div>` **en mémoire**. Il existe, mais il n'est pas encore sur la page.
- **`parent.appendChild(enfant)`** : place `enfant` **à la fin** de `parent`. Si `parent` est déjà sur la page, `enfant` apparaît immédiatement. C'est **le moment où les choses deviennent visibles**.

La technique employée dans `afficherSaucissons` : on assemble les petites pièces dans les grosses (le titre dans le bloc de textes, le bloc de textes dans la carte), et on accroche la carte entière dans la page **en dernier**. Ainsi la page n'est modifiée qu'une fois par carte, quand tout est prêt.

### Écouter

- **`element.addEventListener("click", fonction)`** : « quand cet élément reçoit un clic, exécute cette fonction ». La fonction n'est **pas** exécutée à cet instant : on la confie au navigateur, qui l'appellera plus tard, à chaque clic. *En React : `onClick={fonction}`.*
- **`element.scrollIntoView({ behavior: "smooth", block: "start" })`** : fait défiler la page jusqu'à l'élément.

### Envoyer au serveur

- **`fetch(adresse, options)`** : envoie une requête HTTP. Ici, un POST avec le colis de la commande.
- **`JSON.stringify(objet)`** : transforme un objet en texte (le format JSON), pour l'envoyer. L'inverse, `retour.json()`, transforme la réponse texte en objet.
- **`async` / `await`** : `fetch` prend du temps. Une fonction marquée `async` peut contenir des `await` : à chaque `await`, la fonction **se met en pause jusqu'à la réponse**, sans geler la page.
- **`try / catch / finally`** : `try` tente ; `catch` s'exécute si ça a planté (réseau coupé, réponse illisible) ; `finally` s'exécute **dans tous les cas**, ici pour déverrouiller le bouton.

### Outils du langage

- **`for (const x of liste) { ... }`** : parcourt une liste, comme le `for` amélioré de Java. `const` à l'intérieur donne à chaque tour sa **propre** version de `x` : un bouton créé à un tour se souvient de **son** saucisson.
- **`function () { ... }` sans nom** : une fonction anonyme, comme une lambda Java. C'est ce qu'on passe à `addEventListener`.
- **`Object.assign({}, quantites)`** : fait une **copie** de l'objet `quantites`. Le colis envoyé est ainsi une photo de l'état à cet instant, pas un lien vivant avec lui.
- **`Math.round(x)`** : arrondit à l'entier le plus proche (pour la réduction, en centimes).
- **`.trim()`** : retire les espaces au début et à la fin d'un texte.
- **`/regex/.test(texte)`** : vrai si le texte correspond au motif. Utilisé pour vérifier qu'une adresse e-mail a la forme `x@y.z`.
- **`String(5)`** : transforme en texte (`"5"`).
- **`nombre.toLocaleString("fr-BE", ...)`** : met un nombre au format du pays (virgule décimale, symbole €).
- **`===`** : égalité stricte. À utiliser toujours à la place de `==`.

---

## 5. Quatre passages clés, ligne par ligne

### 5.1. Construire une carte de saucisson (`afficherSaucissons`)

Le code (extrait fidèle) et ce que chaque ligne fait :

```js
const carte = document.createElement("div");   // crée un <div> en mémoire (invisible pour l'instant)
carte.className = "carte";                     // lui donne class="carte" (le CSS le mettra en forme)
carte.id = "carte-" + saucisson.id;            // id="carte-noix" : c'est ce que mettreAJourAffichage retrouvera

const titre = document.createElement("h3");   // crée un <h3> en mémoire
titre.textContent = saucisson.nom;             // y met le texte "Aux noix"

textes.appendChild(titre);                     // accroche le titre dans le bloc "textes" (toujours hors page)
...
carte.appendChild(textes);                     // accroche le bloc de textes dans la carte
carte.appendChild(droite);                     // accroche le bloc "compteur" dans la carte
liste.appendChild(carte);                      // ← ICI la carte apparaît à l'écran (liste est déjà dans la page)
```

L'équivalent en JSX, pour t'y retrouver :

```jsx
<div className="carte" id={"carte-" + saucisson.id}>
  <div>
    <h3>{saucisson.nom}</h3>
    ...
  </div>
  <div className="carte-quantite">...</div>
</div>
```

C'est la même structure. Dans le JSX, l'imbrication se voit dans le texte ; dans `app.js`, elle se fait avec des `appendChild`.

Le bouton « + » de la même carte :

```js
const boutonPlus = document.createElement("button");
boutonPlus.type = "button";                                    // <button type="button"> : ne soumet rien
boutonPlus.id = "plus-" + saucisson.id;                        // id="plus-noix"
boutonPlus.textContent = "+";                                  // le symbole affiché
boutonPlus.setAttribute("aria-label", "Ajouter un saucisson " + saucisson.nom);  // texte lu par un lecteur d'écran
boutonPlus.addEventListener("click", function () {             // consigne confiée au navigateur
  changerQuantite(saucisson.id, 1);                            // exécutée à chaque clic sur CE bouton
});
```

### 5.2. Un clic sur « + », de bout en bout

1. Le navigateur détecte le clic et appelle la fonction confiée à ce bouton : `changerQuantite("noix", 1)`.
2. `changerQuantite` modifie **uniquement l'état** : `quantites["noix"]` augmente de 1 (bornée entre 0 et le maximum).
3. Elle appelle `mettreAJourAffichage()`, qui **redessine tout depuis l'état**. Pour la noix :

```js
document.getElementById("quantite-" + saucisson.id).textContent = String(quantite);
```

   → l'id `"quantite-" + "noix"` donne `"quantite-noix"` : c'est l'`<output>` créé plus tôt dans `afficherSaucissons`. On remplace son texte par la nouvelle quantité.

```js
document.getElementById("carte-" + saucisson.id).classList.toggle("choisie", quantite > 0);
```

   → on retrouve la carte, et on lui met (ou retire) la classe `choisie` selon qu'il y en a au moins un. Le CSS dessine la bordure rouge.

```js
document.getElementById("moins-" + saucisson.id).disabled = (quantite === 0);
```

   → on grise le bouton « − » quand la quantité est zéro.

4. Pour finir, on met à jour la barre du bas (message de réduction et total), avec `calculerMontants()`.

**Où est le lien entre « construire » et « mettre à jour » ?** Dans les **ids** : `afficherSaucissons` les fabrique (`"quantite-" + id`), `mettreAJourAffichage` les retrouve avec la même formule. Si tu changes l'un sans l'autre, la page cesse de se mettre à jour.

### 5.3. Lire le formulaire (`lireFormulaire`)

```js
prenom: document.getElementById("prenom").value.trim(),
```

→ trouve le champ `<input id="prenom">`, lit ce qui y est tapé (`.value`), retire les espaces superflus (`.trim()`). Le résultat devient la valeur de la clé `prenom` du colis.

```js
const coche = document.querySelector('input[name="' + nomGroupe + '"]:checked');
```

→ le sélecteur est construit en collant des morceaux de texte : si `nomGroupe` vaut `"patrouille"`, il devient `input[name="patrouille"]:checked`, c'est-à-dire « un `<input>` dont le `name` est `patrouille` et qui est coché ». La même fonction sert donc aussi pour le groupe `"retrait"`. S'il n'y en a aucun de coché, on obtient `null` : `lireChoix` le gère juste après et renvoie `""`.

On ne suit pas la saisie au fil des frappes (contrairement à un champ contrôlé en React) : on lit **une seule fois, au moment de valider**. C'est plus simple, et suffisant ici.

### 5.4. L'envoi (`validerCommande`)

```js
const retour = await fetch(CONFIG.urlBackend, {
  method: "POST",                                          // on envoie des données
  headers: { "Content-Type": "text/plain;charset=utf-8" }, // voir README : évite la vérification préalable (CORS)
  body: JSON.stringify(donnees)                            // le colis, transformé en texte
});
reponse = await retour.json();                             // la réponse du serveur, retransformée en objet
```

`await` met la fonction en pause **deux fois** : jusqu'à ce que le serveur réponde, puis jusqu'à ce que sa réponse soit lue. Pendant ce temps, la page reste vivante.

Ce qui entoure l'envoi, dans l'ordre : vérifier le formulaire ; verrouiller le bouton ; **tenter** l'envoi (`try`) ; en cas de panne, afficher un message (`catch`) ; **dans tous les cas**, déverrouiller (`finally`).

---

## 6. Pièges classiques de ce style de code (à garder en tête en relisant)

- **Un id mal orthographié** : `getElementById` renvoie `null`, la ligne suivante plante, et la fonction s'arrête au milieu. Si la page se comporte bizarrement, ouvre la console (F12) : l'erreur indique la ligne.
- **Oublier l'accrochage** : un élément créé mais jamais `appendChild`é n'apparaît jamais.
- **Écrire un texte avec `innerHTML`** : on ne l'utilise **jamais** ici, volontairement, pour ne pas exécuter du code glissé par un visiteur. Si tu vois `innerHTML` apparaître un jour dans ce fichier, pose-toi la question.
- **Modifier l'écran sans passer par l'état** : si tu changes un texte à la main sans changer `quantites`, le prochain `mettreAJourAffichage` écrasera ton changement.

---

## 7. Ta responsabilité : quoi vérifier avant le lancement

**Un point d'honnêteté** : ce qui protège l'argent n'est pas dans `app.js` mais dans `backend/Code.gs` (prix recalculé, vérifications, écriture dans le Sheet). Dans `app.js`, tu vérifies surtout que la page **affiche des informations justes** et **ne se casse pas**. Les deux doivent être testés.

### Lecture

1. `calculerMontants` (page) et `calculerMontants` (serveur) : le même calcul ? Même seuil, même pourcentage, même arrondi.
2. `verifierFormulaire` : chaque message correspond bien à la condition testée.
3. `afficherConfirmation` : les textes saisis par le client passent tous par `textContent`.
4. Dans `config.js` et `Config.gs` : prix, patrouilles, retraits **identiques**, lettre pour lettre.

### Plan de test avant lancement (à faire avec le vrai serveur déployé)

1. **Mode test local** : ouvre `index.html` avec `urlBackend` vide et provoque chaque message d'erreur (prénom vide, e-mail faux, aucun saucisson, patrouille manquante, retrait manquant, case non cochée).
2. **Les seuils** : 5 saucissons (pas de réduction) puis 6 (réduction de 1/6). Vérifie le total à l'écran, **puis dans le mail, puis dans le Sheet** : les trois doivent donner le même montant.
3. **Une vraie commande de test** : après le déploiement, passe une commande avec ton propre e-mail. Contrôle la ligne dans l'onglet Commandes (quantités, patrouille, total, communication), le mail reçu, et l'écran de fin. Vérifie aussi dans l'onglet **Réseau** (F12) la requête envoyée et la réponse.
4. **Tentative de triche** : remplis le formulaire, puis dans la console tape ceci (il envoie un faux total, donc doit être **refusé** sans créer de ligne) :

```js
fetch(CONFIG.urlBackend, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
  body: JSON.stringify(Object.assign(lireFormulaire(), { totalAttendu: 100 })) })
  .then(r => r.json()).then(console.log)
```

   Tu dois lire `ok: false` et le message « Les prix ont été mis à jour… ».
5. **Date limite** : mets temporairement une date passée dans `DATE_LIMITE_ISO`, redéploie, vérifie le refus, remets la bonne date et redéploie.
6. **Deux commandes presque simultanées** (deux onglets) : les numéros doivent être différents.
7. **Sur téléphone** : la page doit rester lisible et la barre du bas utilisable.
8. **Avant d'ouvrir la vente** : supprime les lignes de test du Sheet, **en partant du bas** (les numéros se basent sur la dernière ligne), en gardant la ligne de titres.

### Un regard extérieur

Avant d'ouvrir la vente à de vrais clients, fais relire `Code.gs` (le fichier qui touche à l'argent et aux données) par une deuxième personne à l'aise avec le code. Une relecture croisée attrape plus d'erreurs qu'une relecture seul, surtout sur un code que tu viens de découvrir.
