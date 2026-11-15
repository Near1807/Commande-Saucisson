# Précommande de saucissons – Éclaireurs Saint-Paul Waterloo

Une page de commande (statique) et une petite arrière-boutique (Google Apps Script) qui enregistre les commandes dans un Google Sheet et envoie un mail de confirmation avec la demande de virement.

```
site/        La page web (HTML, CSS, JavaScript). Aucune dépendance, aucune requête vers un site tiers.
  index.html   Structure de la page
  style.css    Mise en page
  config.js    Réglages d'AFFICHAGE (saucissons, prix, patrouilles, adresse du serveur)
  app.js       Comportement : total en direct, vérification, envoi, écran de fin
backend/     L'arrière-boutique (Google Apps Script)
  Config.gs    Réglages de RÉFÉRENCE (prix, réduction, date limite, IBAN, mail)
  Code.gs      Réception, vérification, calcul du prix, écriture dans le Sheet, mail, synthèse
  appsscript.json  Droits demandés (Sheet courant + envoi de mail, rien d'autre)
```

## Comment ça marche

1. Le client remplit la page. Le total se calcule en direct dans son navigateur (simple aide).
2. Au clic sur « Valider », la page envoie la commande au serveur (`doPost` dans `Code.gs`).
3. Le serveur **refait tous les contrôles et recalcule le prix lui-même**, à partir de `Config.gs`.
4. Il écrit une ligne dans l'onglet **Commandes** du Sheet, envoie le mail, puis répond à la page.
5. La page affiche le récapitulatif et la demande de virement (compte, bénéficiaire, montant, communication unique) fournis par le serveur.

Le Sheet est la base de données : Fichier → Télécharger → Microsoft Excel (.xlsx) à tout moment.

## Règles de la vente (dans `backend/Config.gs`)

- **Réduction** : **1/6 du total** dès que la commande contient **3 saucissons ou plus, toutes sortes confondues**. Le calcul est `réduction = arrondi(sous-total × 1 / 6)`, en centimes : avec des saucissons à 6 €, la pièce passe à 5 €. Les trois valeurs (seuil, numérateur, dénominateur) se règlent dans `Config.gs` (`REDUCTION_A_PARTIR_DE`, `REDUCTION_NUMERATEUR`, `REDUCTION_DENOMINATEUR`) et dans `config.js` (`reductionAPartirDe`, `reductionNumerateur`, `reductionDenominateur`).
- **Quantité** : de 0 à 20 par sorte.
- **Date limite** : après la date de `DATE_LIMITE_ISO`, le serveur refuse toute commande.
- **Paiement** : la commande n'est validée qu'une fois payée. La colonne **Payé** (case à cocher) se coche à la main en lisant le relevé de compte.
- **Marge** (onglet Synthèse) : calculée sur les commandes **payées** uniquement. Si la patrouille choisie n'est pas « Toute la troupe », elle reçoit 50 % de la marge et la troupe 50 % ; sinon la troupe reçoit tout. Le pourcentage se règle avec `PART_PATROUILLE_POURCENT`.

## À remplir avant le lancement

Les valeurs actuelles sont des exemples.

| Quoi | Où |
|---|---|
| Saucissons, prix de vente, prix d'achat | `backend/Config.gs` (`SAUCISSONS`) **et** `site/config.js` (`saucissons`, sans prix d'achat) |
| Patrouilles | `backend/Config.gs` **et** `site/config.js` : textes identiques |
| Modes de retrait (dates, lieux) | `backend/Config.gs` **et** `site/config.js` : textes identiques |
| IBAN, titulaire | `backend/Config.gs` uniquement |
| Date limite | `backend/Config.gs` (`DATE_LIMITE_ISO`, la vraie) **et** `site/config.js` (`dateLimiteTexte`, affichage) |
| Adresse de contact | `backend/Config.gs` **et** `site/config.js` |
| Adresse du serveur | `site/config.js` (`urlBackend`), voir ci-dessous |
| **Textes écrits à la main dans `site/index.html`** (présentation, « 6 € la pièce », « à partir de 3 saucissons… 5 € », dates de clôture et de retrait « XXX ») | `site/index.html` uniquement : **ils ne se mettent pas à jour tout seuls** quand on change la config, à relire à chaque changement de prix ou de règle |

Si une valeur d'affichage ne correspond pas à celle du serveur, le serveur refuse la commande (« Les prix ont été mis à jour »). C'est voulu : un écart ne peut pas passer inaperçu.

## Tester sans rien installer

Ouvrir `site/index.html` dans un navigateur. Tant que `urlBackend` est vide (`""`), la page est en **mode test** : une bannière l'indique, rien n'est envoyé ni enregistré, et l'écran de fin affiche un récapitulatif d'exemple.

## Mise en ligne (à faire plus tard)

**Arrière-boutique**
1. Créer un Google Sheet vide.
2. Extensions → Apps Script. Créer les fichiers `Config.gs` et `Code.gs` avec le contenu de `backend/`. Pour `appsscript.json` : Paramètres du projet → cocher « Afficher le fichier manifeste appsscript.json », puis remplacer son contenu.
3. Lancer une fois la fonction `creerFeuilleSynthese` (bouton Exécuter) : Google demande d'autoriser le script, et l'onglet Synthèse est créé.
4. Déployer → Nouveau déploiement → type « Application web » ; Exécuter en tant que : **moi** ; Accès : **tout le monde**. Copier l'URL (elle se termine par `/exec`).
5. Pour modifier le code plus tard : Déployer → **Gérer les déploiements** → modifier la version du déploiement existant (un « nouveau déploiement » changerait l'URL).

**Page**
1. Coller l'URL dans `urlBackend` de `site/config.js`.
2. Publier le dossier `site/` (par exemple avec GitHub Pages).
3. Faire une vraie commande de test, puis supprimer la ligne de test dans le Sheet (voir « Ne pas faire » ci-dessous avant de supprimer).

## Ce que le serveur contrôle (pour l'audit)

Tout est dans `backend/Code.gs`, fonction `verifierDonnees` puis `traiterCommande`.

| Contrôle | Pourquoi |
|---|---|
| Date limite dépassée → refus | La vente est fermée |
| Champ piège `site_web` rempli → refus | Un robot le remplit, pas un humain |
| Case d'acceptation obligatoire | Usage des données |
| Textes nettoyés et limités en longueur | Pas de caractères de contrôle, pas de texte géant |
| E-mail, téléphone, prénom et nom obligatoires | Pouvoir joindre le client |
| Patrouille et retrait = exactement un choix de `Config.gs` | Pas de valeur inventée |
| Identifiants de saucissons connus, quantités entières de 0 à 20 | Pas de quantité négative, décimale ou absurde |
| Au moins un saucisson | Pas de commande vide |
| **Prix recalculé par le serveur**, comparé au total envoyé par la page | La page ne décide jamais du montant ; un écart refuse la commande |
| Écriture dans le Sheet sous verrou | Deux commandes simultanées ne se mélangent pas |
| Texte commençant par `=`, `+`, `-` ou `@` précédé d'une apostrophe | Empêche l'exécution d'une formule injectée dans le Sheet |
| Vérification des titres de colonnes avant d'écrire | Évite des colonnes décalées si la liste des saucissons change |
| Si le mail échoue, la commande reste enregistrée et « ÉCHEC : … » est noté | Aucune commande perdue |

Côté page : les textes saisis par le client sont affichés avec `textContent` (jamais comme du HTML), et le formulaire disparaît après l'envoi pour éviter un double envoi.

**Droits demandés** (`appsscript.json`) : uniquement le Sheet auquel le script est lié, et l'envoi de mails. Rien d'autre.

## À savoir

- **Quota de mails** : environ 100 destinataires par jour avec un compte Gmail gratuit. Au-delà, le mail échoue (noté dans le Sheet) mais la commande est enregistrée et la page affiche quand même la demande de virement.
- **L'URL du serveur est publique** (elle est dans `config.js`). N'importe qui peut donc lui envoyer une commande : c'est pourquoi tous les contrôles ci-dessus sont faits côté serveur. Un client malveillant ne peut pas changer un prix, mais peut passer de fausses commandes, qui resteront non payées et donc non validées.
- **Ne pas faire** après le début de la vente : modifier la liste des saucissons (les colonnes seraient décalées, le serveur refuserait d'écrire) ou supprimer des lignes du Sheet (les numéros de commande reposent sur la dernière ligne). Pour annuler une commande, la laisser non payée, ou ajouter un mot dans la colonne Remarque.
- **Changement de prix** en cours de vente : modifier `Config.gs` **et** `config.js`, redéployer le serveur. Les clients qui avaient déjà la page ouverte recevront « Les prix ont été mis à jour ».
- Les données personnelles sont dans votre Sheet : ne le partagez qu'avec les personnes qui en ont besoin et supprimez-le quand la vente est terminée.
- La date limite du serveur est à l'heure de Belgique (+01:00 en hiver, +02:00 en été) : adapter le suffixe si la date tombe en heure d'été.
