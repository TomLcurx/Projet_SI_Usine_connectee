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
