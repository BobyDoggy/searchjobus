# SearchJobUs

Outil simple de suivi de candidatures d'emploi, utilisable directement dans le navigateur sans installation.

## Fonctionnalités

- **Tableau de bord** : visualisez toutes vos candidatures en un coup d'œil avec des statistiques (total, à relancer, entretiens en cours)
- **CRUD complet** : ajoutez, modifiez et supprimez vos candidatures
- **Relance automatique** : un indicateur visuel s'affiche lorsqu'une candidature est restée sans réponse plus de 7 jours
- **Suivi du statut** : Envoyée → Relancée → Entretien planifié → Offre reçue / Refusée
- **Stockage local** : les données sont sauvegardées dans le navigateur (localStorage), aucun serveur requis

## Données suivies par candidature

| Champ | Description |
|---|---|
| Entreprise | Nom de l'entreprise |
| Contact | Nom, email ou téléphone du recruteur |
| Date de dépôt | Date d'envoi de la candidature |
| Prétention salariale | Fourchette min / max souhaitée |
| Statut | Étape actuelle de la candidature |
| Commentaire | Notes libres |

## Utilisation

Aucune installation requise. Ouvrez simplement `index.html` dans votre navigateur.

## Technologies

HTML / CSS / JavaScript vanilla — données persistées via `localStorage`.
