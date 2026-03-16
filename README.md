# TP CICD

## GUERRA Daniel, SANNA Thomas

---

## 1. Audit du système existant

### Situation actuelle

| Processus | Description actuelle |
|---|---|
| Déploiement | Manuel, sans procédure standardisée |
| Gestion du code | Push direct en production, pas de branches ni de revue de code |
| Configuration serveurs | Manuelle, sans documentation |
| Tests | Délégué à un prestataire, exécutés sur les machines personnelles des testeurs |
| Infrastructure | Serveur physique sur place, coûteux et peu scalable |

### Problèmes identifiés

#### 1. Absence de pipeline CI/CD
- **Problème** : Les déploiements sont manuels et non reproductibles.
- **Risque** : Erreurs humaines lors du déploiement, temps de mise en production long.
- **Impact** : Les corrections critiques vont mettre trop de temps à arriver en production, ce qui dégrade, notamment, l'expérience utilisateur, mais aussi la confiance des clients.

#### 2. Push direct en production (pas de workflow Git)
- **Problème** : Il n'y a aucune stratégie de branches, mais aussi, pas de revue de code, ni de protection de la branche main.
- **Risque** : On obtient rapidement du code non testé ou buggé qui arrive directement en production, et donc, comme le sujet l'indique, les fonctionnalités, qui, autrefois étaient fix, ne le sont plus, etc...
- **Impact** : Instabilité constante de la plateforme, multiplication des bugs en production, puis, en conséquence, une perte de confiance des utilisateurs.

#### 3. Tests non automatisés et externalisés
- **Problème** : Les tests sont réalisés manuellement par un prestataire externe sur sa machine personnelle et donc sur des environnements non standardisés.
- **Risque** : En conséquence de cela, on a une ouverture de tests incomplète et non reproductible, ainsi que des résultats varient selon l'environnement du testeur. Et pour introduire ce qu'on va faire après, aucun test n'est exécuté avant le déploiement.
- **Impact** : Les régressions ne sont pas détectées avant la mise en production, ce qui explique probablement les plaintes des utilisateurs.

#### 4. Configuration manuelle des serveurs sans documentation
- **Problème** : Pas d'Infrastructure as Code (IaC), aucune documentation de la configuration serveur.
- **Risque** : Impossibilité de recréer l'environnement en cas de panne. Configuration incohérente entre les environnements. Configuration diffère trop au fil du temps.
- **Impact** : Temps de récupération très long en cas de problème, difficulté à diagnostiquer les problèmes, impossible de scaler.

#### 5. Serveur physique sur place
- **Problème** : Un seul serveur physique dans les locaux, coûteux en maintenance.
- **Risque** : Point unique de défaillance. Pas de scalabilité horizontale. Coût d'entretien élevé sans bénéfice de haute disponibilité.
- **Impact** : Performances dégradées sous charge, indisponibilité en cas de panne physique, coûts trop élevés par rapport au service donné.

## 2. Proposition d'architecture DevOps

### Stratégie de gestion de code (GitFlow)

On utilise le GitFlow, un workflow adapté à notre situation. On l'a aussi déjà utilisé pour des projets cette année (et les années précédentes).

1. La branche `main` contient que le code en production, stable et déployé. Personne push directement dessus.
2. La branche `develop` est la branche d'intégration où toutes les fonctionnalités sont mergées et testées ensemble avant d'aller en production.
3. Pour chaque nouvelle fonctionnalité ou correction, on crée une branche dédiée depuis develop (ex: feature/ajout-panier, fix/bug-login).
4. Une fois le développement fini, on ouvre une Pull Request (PR) sur develop.
5. La PR doit passer les tests automatisés et être validée par au moins un autre développeur (code review) avant d'être mergée.
6. Quand develop est stable et prêt pour une release, on merge develop sur main, ce qui déclenche le déploiement automatique en production.

### Stratégie de gestion des branches

| Branche | Rôle | Protection |
|---|---|---|
| main | Code en production, stable et déployé | Push direct interdit, merge uniquement depuis develop ou hotfix/* |
| develop | Branche d'intégration, où les features sont testées ensemble | Push direct interdit, merge uniquement via PR validée |
| feature/* | Développement de nouvelles fonctionnalités | Créée depuis develop, mergée dans develop, supprimée après merge |
| fix/* | Correction de bugs | Crééée depuis develop, mergée dans develop, supprimée après merge |
| hotfix/* | Correction urgente en production | Créée depuis main, mergée dans main ET develop |

### Stratégie de tests automatisés

On met en place plusieurs niveaux de tests exécutés automatiquement dans le pipeline CI. 

| Type de test | Objectif | Outil | Quand |
|---|---|---|---|
| Tests unitaires | Vérifier chaque fonction/composant individuellement | Jest, Pytest, etc. (selon le langage) | A chaque push sur une branche |
| Tests d'intégration | Vérifier que le frontend, backend et BDD communiquent bien ensemble | Docker Compose + scripts de test | À chaque PR vers develop |
| Analyse statique | Détecter les erreurs de style et les mauvaises pratiques | ESLint, Flake8, etc. | À chaque push |

Tout cela remplace le prestataire externe et garantit que les tests sont reproductibles, puisqu'ils tournent dans un environnement isolé (conteneurs Docker sur GitHub Actions).

### Architecture d'infrastructure

On passe d'un serveur physique sur place à une infrastructure cloud en utilisant GitHub Actions qui exécute le pipeline CI/CD (build, tests et déploiement)n GHCR qui stocke les images Docker versionnées, et enfin le VPS Cloud (on a notamment utilisé AWS durant ces cours) qui va héberger l'application en production via des conteneurs Docker.

### Solution de conteneurisation

On utilise Docker et **Docker Compose** pour conteneuriser l'application :

| Service | Image | Port |
|---|---|---|
| Frontend | masterapp-frontend | 80 |
| Backend | masterapp-backend | 3000 |
| Base de données | postgres (ou mysql) | 5432 |

On obtiendra au final, bien un environnement identique en développement, test et production, un déploiement reproductible et rapide avec docker compose up -d, mais aussi une scalabilité facilitée  puisque l'on peut lancer plusieurs instances d'un service. Et enfin, l'isolation des services : un crash du backend n'impactera plus le frontend

---

## 3. Plan d'automatisation

### Construction du projet

La construction est automatisée avec les GitHub Actions. A chaque push sur une branche, la pipeline:

1. Récupère le code source (actions/checkout) ;
2. Installe les dépendances du frontend et du backend ;
3. Build le projet (avec npm run build pour le frontend, par exemple).

### Exécution des tests

Les tests sont déclenchés automatiquement dans le pipeline CI:

1. A chaque push on exécution des tests unitaires et de l'analyse statique ;
2. A chaque PR vers la branche develop on fait l'exécution des tests d'intégration en plus avec Docker Compose ;
3. Si les tests ne passent pas, la PR ne peut pas être mergée.

### Construction des images Docker

Une fois les tests passés, les images Docker sont build et publiées :

1. Build des images Docker pour le frontend et le backend (docker build) ;
2. Tag des images avec le numéro de version et latest (docker tag) ;
3. Push des images sur GHCR (GitHub Container Registry).

### Déploiement

Le déploiement est déclenché automatiquement lors du merge sur main, et suivent ces étapes : 

1. Connexion au VPS via SSH (appleboy/ssh-action comme vu en cours) ;
2. Pull des dernières images depuis GHCR ;
3. Arrêt des anciens conteneurs ;
4. Lancement des nouveaux conteneurs avec `docker compose up -d` ;
5. Et pourquoi pas une vérification que l'application répond correctement (avec curl localhost:PORT par exemple).

Il faut noter que nous utilisons GHCR plutôt que Docker Hub, premièrement, et la plus importante, car GHCR est une intégration native à GitHub. Ca nous simplifie alors la gestion des permissions (par ex. le GITHUB_TOKEN). Et enfin, car Docker Hub est connu pour ses quotas stricts sur le nombre de pulls.