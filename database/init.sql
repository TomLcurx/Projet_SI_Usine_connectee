CREATE DATABASE IF NOT EXISTS supervision
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE supervision;

-- Table des automates
CREATE TABLE IF NOT EXISTS automates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    adresse_ip VARCHAR(45) NOT NULL,
    port_modbus INT NOT NULL DEFAULT 502,
    unite_id INT NOT NULL DEFAULT 1,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des variables à surveiller
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
    unite VARCHAR(30),
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automate_id)
        REFERENCES automates(id)
        ON DELETE CASCADE
);

-- Historique des mesures
CREATE TABLE IF NOT EXISTS mesures (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    variable_id INT NOT NULL,
    valeur DOUBLE NOT NULL,
    date_mesure TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_variable_date (variable_id, date_mesure),
    FOREIGN KEY (variable_id)
        REFERENCES variables(id)
        ON DELETE CASCADE
);
