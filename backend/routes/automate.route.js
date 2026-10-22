const express = require("express");
const router = express.Router();
const db = require("../src/config");

// GET /api/automates : récupérer tous les automates
router.get("/", async (req, res) => {
    try {
        const [automates] = await db.query(
            `SELECT id, nom, adresse_ip, port_modbus, unite_id, actif, date_creation
             FROM automates
             ORDER BY id`
        );

        res.json(automates);
    } catch (error) {
        console.error("Erreur lors de la récupération :", error);
        res.status(500).json({
            error: "Impossible de récupérer les automates"
        });
    }
});

// POST /api/automates : ajouter un automate
router.post("/", async (req, res) => {
    try {
        const {
            nom,
            adresse_ip,
            port_modbus = 502,
            unite_id = 1,
            actif = true
        } = req.body;

        // Vérifier les champs obligatoires
        if (
            typeof nom !== "string" || !nom.trim() ||
            typeof adresse_ip !== "string" || !adresse_ip.trim()
        ) {
            return res.status(400).json({
                error: "Le nom et l'adresse IP sont obligatoires"
            });
        }

        // Vérifier les paramètres numériques
        if (
            !Number.isInteger(port_modbus) ||
            port_modbus < 1 || port_modbus > 65535 ||
            !Number.isInteger(unite_id) ||
            unite_id < 0 || unite_id > 255 ||
            typeof actif !== "boolean"
        ) {
            return res.status(400).json({
                error: "Paramètres de connexion invalides"
            });
        }

        // Insérer l'automate dans MariaDB
        const [result] = await db.query(
            `INSERT INTO automates
                (nom, adresse_ip, port_modbus, unite_id, actif)
             VALUES (?, ?, ?, ?, ?)`,
            [nom.trim(), adresse_ip.trim(), port_modbus, unite_id, actif]
        );

        res.status(201).json({
            message: "Automate ajouté avec succès",
            id: result.insertId
        });
    } catch (error) {
        console.error("Erreur lors de l'ajout :", error);
        res.status(500).json({
            error: "Impossible d'ajouter l'automate"
        });
    }
});


/**
 * GET /api/variables
 * Récupérer toutes les variables
 */
router.get("/../variables", async (req, res) => {
    try {
        const [variables] = await db.query(
            `SELECT id, automate_id, nom, adresse_registre,
                    type_registre, type_donnee, unite, actif, date_creation
             FROM variables
             ORDER BY automate_id, id`
        );

        res.json(variables);
    } catch (error) {
        console.error("Erreur lors de la récupération des variables :", error);
        res.status(500).json({
            error: "Impossible de récupérer les variables"
        });
    }
});

/**
 * GET /api/automates/:id/variables
 * Récupérer les variables d'un automate
 */
router.get("/:id/variables", async (req, res) => {
    try {
        const automateId = Number(req.params.id);

        if (!Number.isInteger(automateId) || automateId <= 0) {
            return res.status(400).json({
                error: "Identifiant d'automate invalide"
            });
        }

        const [variables] = await db.query(
            `SELECT id, automate_id, nom, adresse_registre,
                    type_registre, type_donnee, unite, actif, date_creation
             FROM variables
             WHERE automate_id = ?
             ORDER BY id`,
            [automateId]
        );

        res.json(variables);
    } catch (error) {
        console.error("Erreur lors de la récupération des variables :", error);
        res.status(500).json({
            error: "Impossible de récupérer les variables"
        });
    }
});

/**
 * POST /api/automates/:id/variables
 * Ajouter une variable à un automate
 */
router.post("/:id/variables", async (req, res) => {
    try {
        const automateId = Number(req.params.id);

        const {
            nom,
            adresse_registre,
            type_registre = "holding",
            type_donnee = "uint16",
            unite = null,
            actif = true
        } = req.body;

        const typesRegistre = ["holding", "input", "coil", "discrete"];
        const typesDonnee = [
            "int16", "uint16", "int32", "uint32", "float32", "boolean"
        ];

        if (!Number.isInteger(automateId) || automateId <= 0) {
            return res.status(400).json({
                error: "Identifiant d'automate invalide"
            });
        }

        if (typeof nom !== "string" || !nom.trim()) {
            return res.status(400).json({
                error: "Le nom de la variable est obligatoire"
            });
        }

        if (
            !Number.isInteger(adresse_registre) ||
            adresse_registre < 0 ||
            adresse_registre > 65535
        ) {
            return res.status(400).json({
                error: "Adresse de registre invalide"
            });
        }

        if (!typesRegistre.includes(type_registre)) {
            return res.status(400).json({
                error: "Type de registre invalide"
            });
        }

        if (!typesDonnee.includes(type_donnee)) {
            return res.status(400).json({
                error: "Type de donnée invalide"
            });
        }

        if (typeof actif !== "boolean") {
            return res.status(400).json({
                error: "Le champ actif doit être un booléen"
            });
        }

        if (
            unite !== null &&
            (typeof unite !== "string" || unite.length > 30)
        ) {
            return res.status(400).json({
                error: "Unité invalide (30 caractères maximum)"
            });
        }

        // Vérifier que l'automate existe
        const [automates] = await db.query(
            "SELECT id FROM automates WHERE id = ?",
            [automateId]
        );

        if (automates.length === 0) {
            return res.status(404).json({
                error: "Automate introuvable"
            });
        }

        // Enregistrer la variable
        const [result] = await db.query(
            `INSERT INTO variables
                (automate_id, nom, adresse_registre, type_registre,
                 type_donnee, unite, actif)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                automateId,
                nom.trim(),
                adresse_registre,
                type_registre,
                type_donnee,
                unite,
                actif
            ]
        );

        res.status(201).json({
            message: "Variable ajoutée avec succès",
            id: result.insertId
        });
    } catch (error) {
        console.error("Erreur lors de l'ajout de la variable :", error);
        res.status(500).json({
            error: "Impossible d'ajouter la variable"
        });
    }
});


module.exports = router;
