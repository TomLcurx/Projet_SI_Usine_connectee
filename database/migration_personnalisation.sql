USE supervision;

-- Remplacer l'index unique par deux index adaptés aux clés étrangères
CREATE INDEX idx_preferences_utilisateur_ordre
    ON preferences_affichage (utilisateur_id, ordre_affichage);

CREATE INDEX idx_preferences_variable
    ON preferences_affichage (variable_id);

-- Autoriser plusieurs affichages pour une même variable
ALTER TABLE preferences_affichage
    DROP INDEX uq_utilisateur_variable;

-- Ajouter un titre personnalisable à chaque affichage
ALTER TABLE preferences_affichage
    ADD COLUMN titre VARCHAR(100) DEFAULT NULL;

-- Ajouter une période d'affichage pour les graphiques
ALTER TABLE preferences_affichage
    ADD COLUMN periode_minutes INT NOT NULL DEFAULT 60;