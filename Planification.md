# Ici on met notre plan d'action pour réaliser le projet :

## 1. Récupération des données industrielles

- Permettre à l'utilisateur de configurer les automates à surveiller en renseignant leur adresse IP et les paramètres de connexion nécessaires.
- Définir les variables à récupérer pour chaque automate : nom, adresse du registre ou de la variable, type de donnée et fréquence de lecture.
- Communiquer avec les automates via le protocole Modbus afin de lire les valeurs des variables configurées.
- Prévoir un mode de simulation permettant de tester l'application sans automate physique.
- Gérer les erreurs de communication, les automates indisponibles et les lectures incorrectes.

## 2. Traitement des données

- Récupérer automatiquement les valeurs des variables selon la fréquence définie par l'utilisateur.
- Associer chaque valeur à un horodatage afin de connaître précisément le moment de la mesure.
- Vérifier la validité des données reçues et détecter les erreurs de lecture.
- Identifier les données manquantes ou les pertes de communication pour éviter de présenter des mesures invalides comme des valeurs normales.
- Organiser les données pour permettre leur stockage, leur affichage et leur exploitation ultérieure.

## 3. Stockage des données

- Mettre en place une base de données MariaDB pour enregistrer les configurations des automates, les variables surveillées et les mesures collectées.
- Conserver l'historique des valeurs avec leur date et heure de collecte.
- Permettre l'ajout, la modification et la suppression des variables à surveiller.
- Assurer la cohérence entre les paramètres configurés et les tâches de lecture exécutées par le backend.
- Prévoir une gestion de l'historique afin de limiter l'accumulation excessive de données.

## 4. Développement de l'interface utilisateur

- Créer une interface web accessible depuis un navigateur sur le réseau local.
- Développer une page de configuration permettant d'ajouter des automates et de définir les variables à surveiller.
- Afficher les informations principales : nom de la variable, valeur actuelle, unité de mesure, date de la dernière mesure et état de la communication.
- Créer un tableau de bord avec des graphiques interactifs qui se mettent à jour automatiquement.
- Ajouter des indicateurs visuels permettant de distinguer les variables opérationnelles, les erreurs de lecture et les pertes de connexion.

## 5. Consultation et exploitation des données

- Permettre à l'utilisateur de consulter l'historique des mesures d'une variable.
- Ajouter un filtre par variable et par plage de dates.
- Afficher les données historiques sous forme de graphiques afin de visualiser l'évolution des paramètres industriels.
- Permettre l'exportation des données au format CSV pour une exploitation dans Excel ou d'autres outils d'analyse.
- Faciliter l'identification des variations anormales et des tendances d'évolution des variables.

## 6. Développement du backend et de l'API

- Développer un backend avec Node.js et Express pour gérer les échanges entre l'interface, la base de données et les automates.
- Créer une API REST permettant de gérer les configurations, récupérer les dernières mesures et consulter l'historique.
- Mettre en place des tâches périodiques pour interroger automatiquement les automates.
- Adapter dynamiquement la surveillance lorsqu'une variable est ajoutée, modifiée ou supprimée, sans redémarrer le serveur.
- Centraliser la gestion des erreurs et des connexions afin de rendre l'application plus fiable.

## 7. Déploiement et mise en réseau

- Conteneuriser le frontend, le backend et la base de données avec Docker.
- Utiliser Docker Compose pour lancer et gérer les différents services.
- Configurer le réseau Docker afin de permettre la communication entre les conteneurs.
- Rendre l'application accessible depuis un autre ordinateur connecté au réseau local.
- Tester le fonctionnement global de l'application après son déploiement et documenter les étapes d'installation.

## 8. Tests et validation

- Vérifier la lecture des données simulées puis, si le matériel est disponible, celles d'un automate réel.
- Tester l'ajout, la modification et la suppression des variables surveillées.
- Vérifier l'enregistrement des mesures et la cohérence des horodatages.
- Tester l'actualisation des graphiques, la consultation de l'historique et l'export CSV.
- Simuler des erreurs réseau et des pertes de communication pour vérifier le comportement de l'application.
- Valider l'accès depuis plusieurs postes du réseau local.

## 9. Documentation et livrables

- Organiser le code source dans un dépôt GitHub avec des branches adaptées au travail en équipe.
- Utiliser des commits explicites et des pull requests pour suivre les modifications.
- Rédiger un README présentant l'architecture, les technologies utilisées, l'installation et le lancement de l'application.
- Réaliser un schéma de l'architecture technique et des échanges entre les différents composants.
- Rédiger le rapport technique présentant les objectifs, les choix techniques, les fonctionnalités réalisées, les tests et les limites du prototype.
- Préparer une démonstration fonctionnelle illustrant le parcours complet, de la configuration d'une variable jusqu'à l'affichage et l'export de ses données.

Objectif final : obtenir une application de supervision industrielle modulaire, portable et open source permettant de configurer des variables d'automates, de collecter leurs valeurs, de les historiser et de les visualiser en temps réel, tout en facilitant leur exploitation grâce à un tableau de bord web et à l'export des données.
