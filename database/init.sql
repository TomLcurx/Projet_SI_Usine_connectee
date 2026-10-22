
CREATE DATABASE IF NOT EXISTS supervision
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE supervision;


-- =========================================
-- TABLE DES AUTOMATES
-- =========================================

CREATE TABLE IF NOT EXISTS automates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    adresse_ip VARCHAR(45) NOT NULL,
    port_modbus INT NOT NULL DEFAULT 502,
    unite_id INT NOT NULL DEFAULT 1,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- TABLE DES UTILISATEURS
-- =========================================

CREATE TABLE IF NOT EXISTS utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifiant VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'operateur', 'utilisateur')
        NOT NULL DEFAULT 'utilisateur',
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- =========================================
-- TABLE DES VARIABLES A SURVEILLER
-- =========================================

CREATE TABLE IF NOT EXISTS variables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    automate_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    adresse_registre INT NOT NULL,

    type_registre ENUM(
        'holding',
        'input',
        'coil',
        'discrete'
    ) NOT NULL DEFAULT 'holding',

    type_donnee ENUM(
        'int16',
        'uint16',
        'int32',
        'uint32',
        'float32',
        'boolean'
    ) NOT NULL DEFAULT 'uint16',

    unite VARCHAR(30) DEFAULT NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

    intervalle_ms INT NOT NULL DEFAULT 2000,
    grandeur VARCHAR(50) NOT NULL DEFAULT 'autre',
    facteur_conversion DOUBLE NOT NULL DEFAULT 1,
    offset_conversion DOUBLE NOT NULL DEFAULT 0,
    ecriture_autorisee BOOLEAN NOT NULL DEFAULT FALSE,

    FOREIGN KEY (automate_id)
        REFERENCES automates(id)
        ON DELETE CASCADE
);


-- =========================================
-- TABLE DE L'HISTORIQUE DES MESURES
-- =========================================

CREATE TABLE IF NOT EXISTS mesures (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    variable_id INT NOT NULL,
    valeur DOUBLE NOT NULL,
    date_mesure TIMESTAMP(3) NOT NULL
        DEFAULT CURRENT_TIMESTAMP(3),

    INDEX idx_variable_date (variable_id, date_mesure),

    FOREIGN KEY (variable_id)
        REFERENCES variables(id)
        ON DELETE CASCADE
);


-- =========================================
-- TABLE DES PREFERENCES D'AFFICHAGE
-- =========================================

CREATE TABLE IF NOT EXISTS preferences_affichage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    variable_id INT NOT NULL,

    visible BOOLEAN NOT NULL DEFAULT TRUE,

    type_affichage ENUM(
        'valeur',
        'carte',
        'jauge',
        'graphique'
    ) NOT NULL DEFAULT 'carte',

    ordre_affichage INT NOT NULL DEFAULT 0,

    UNIQUE KEY uq_utilisateur_variable (
        utilisateur_id,
        variable_id
    ),

    FOREIGN KEY (utilisateur_id)
        REFERENCES utilisateurs(id)
        ON DELETE CASCADE,

    FOREIGN KEY (variable_id)
        REFERENCES variables(id)
        ON DELETE CASCADE
);
