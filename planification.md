Le projet consiste à développer une application web de supervision industrielle permettant de récupérer, traiter et visualiser les données provenant d’automates industriels.

L’application permettra aux utilisateurs de configurer les automates et les variables à surveiller, de récupérer automatiquement les valeurs via le protocole Modbus, puis de les enregistrer dans une base de données MariaDB afin de conserver leur historique.

Les données seront accessibles depuis une interface web proposant un tableau de bord avec des graphiques en temps réel ainsi qu’une fonctionnalité d’export au format CSV.

Le développement reposera sur HTML, CSS, JavaScript, Node.js, Express.js et MariaDB. Enfin, l’application sera déployée avec Docker et Docker Compose afin de faciliter son installation et de permettre son accès depuis les autres ordinateurs du réseau local.

L’objectif est de proposer une solution open source, modulaire et facile à déployer, permettant aux industriels de surveiller leurs équipements de manière autonome, sans dépendre de logiciels propriétaires coûteux.

# Étapes du projet et outils utilisés

- 1\. Récupération des données : lecture des variables des automates via le protocole Modbus avec Node.js.
- 2\. Traitement des données : vérification des valeurs et ajout d'un horodatage avec JavaScript.
- 3\. Stockage des données : enregistrement des configurations et des mesures dans une base de données MariaDB.
- 4\. Développement du backend : création d'une API avec Node.js et Express.js pour gérer les données.
- 5\. Développement du frontend : création d'une interface web avec HTML, CSS, JavaScript et Bootstrap.
- 6\. Visualisation des données : affichage des valeurs en temps réel avec des graphiques réalisés avec Chart.js.
- 7\. Export des données : récupération de l'historique et export au format CSV.
- 8\. Déploiement de l'application : utilisation de Docker, Docker Compose et Nginx pour rendre l'application accessible sur le réseau local.

Faire une page Paramètres pour choisir les trucs à vérifier, le temps etc en fonction de là où l'appli est utilisée

Faire page Historique

# GUIDE DE LANCEMENT — PROJET SI USINE CONNECTÉE
================================================

1. PRÉREQUIS

Chaque personne souhaitant lancer l'application doit disposer de :
- Docker Desktop installé sur son ordinateur.
- Une connexion Internet lors du premier lancement.
- L'accès au dépôt GitHub du projet.

Téléchargement de Docker Desktop :
https://www.docker.com/products/docker-desktop/

Il n'est pas nécessaire d'installer séparément Node.js, npm ou MariaDB.

2. RÉCUPÉRER LE PROJET

Ouvrir un terminal et se placer dans le dossier où le projet doit être installé.

Cloner le dépôt GitHub avec la commande :

git clone https://github.com/TomLcurx/Projet_SI_Usine_connectee.git

Entrer dans le dossier du projet :

cd Projet_SI_Usine_connectee

Si le projet est déjà présent sur l'ordinateur, récupérer les dernières modifications avec :

git pull origin main

Attention : avant un git pull, vérifier que les modifications locales importantes sont enregistrées ou sauvegardées.

3. DÉMARRER DOCKER

Ouvrir Docker Desktop et attendre que le moteur Docker soit démarré.

Vérifier son fonctionnement dans le terminal :

docker info

Si les informations du serveur Docker s'affichent, continuer.

4. LANCER L'APPLICATION

Vérifier que le terminal se trouve à la racine du projet, dans le dossier contenant docker-compose.yml.

Lancer les services avec :

docker compose up -d --build

Cette commande construit l'image du backend si nécessaire et démarre les conteneurs configurés dans Docker Compose, notamment MariaDB et le backend.

Au premier lancement, le téléchargement des images et l'installation des dépendances peuvent prendre quelques minutes.

5. VÉRIFIER LE DÉMARRAGE

Afficher l'état des conteneurs :

docker compose ps

Le conteneur MariaDB doit finir par afficher l'état "healthy".
Le backend doit être démarré.

Pour consulter les journaux du backend :

docker compose logs backend

Pour consulter les journaux de MariaDB :

docker compose logs db

6. TESTER L'API

Ouvrir cette adresse dans un navigateur :

http://localhost:3000/api/health

Une réponse JSON similaire à celle-ci doit apparaître :

{
  "status": "ok",
  "message": "L'API fonctionne correctement"
}

Si cette réponse apparaît, l'API répond correctement.

7. ARRÊTER L'APPLICATION

Pour arrêter les conteneurs sans supprimer les données de la base :

docker compose stop

Pour redémarrer les services :

docker compose start

Pour arrêter et supprimer les conteneurs du projet :

docker compose down

La commande docker compose down ne supprime normalement pas le volume nommé mariadb_data.
Les données de MariaDB sont donc conservées.

ATTENTION :
Ne pas utiliser docker compose down -v sans raison valable.
L'option -v supprime les volumes associés au projet et peut entraîner la perte des données de la base.

8. METTRE À JOUR LE PROJET

Si un membre de l'équipe a envoyé de nouvelles modifications sur GitHub :

1. Arrêter ou quitter proprement le travail en cours.
2. Enregistrer ou sauvegarder les éventuelles modifications locales.
3. Récupérer les modifications :

git pull origin main

4. Reconstruire et relancer les services :

docker compose up -d --build

Cette étape est particulièrement importante après une modification du backend ou du Dockerfile.

9. DÉPANNAGE

Si Docker ne fonctionne pas :
- Vérifier que Docker Desktop est ouvert.
- Attendre que le moteur indique qu'il est démarré.
- Réessayer avec docker info.

Si le backend ne démarre pas :
- Exécuter docker compose ps.
- Consulter docker compose logs backend.

Si MariaDB ne démarre pas :
- Consulter docker compose logs db.

Si le port 3000 est déjà utilisé :
- Vérifier qu'une autre application n'utilise pas ce port avant de modifier la configuration.

10. INFORMATIONS IMPORTANTES

- Chaque ordinateur possède son propre volume de données MariaDB.
- Les données de la base ne sont pas synchronisées automatiquement entre les membres de l'équipe.
- Le fichier database/init.sql initialise les tables lors de la première création d'un volume de données vierge.
- Les mots de passe présents dans la configuration actuelle sont des valeurs de développement.
- L'API de test est disponible sur le port 3000.
- L'application complète de supervision nécessitera également le frontend et l'intégration des fonctionnalités métier prévues dans le projet.

*FIN DU GUIDE*
