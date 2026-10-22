const express = require("express");
const router = express.Router();
const db = require("../src/config");

// GET /api/automates
// Récupère tous les automates enregistrés dans la base
router.get("/", async (req, res) => {
    try {
        const [automates] = await db.query(
            `SELECT id, nom, adresse_ip, port_modbus, unite_id, actif, date_creation
             FROM automates
             ORDER BY id`
        );

        res.json(automates);
    } catch (error) {
        console.error("Erreur lors de la récupération des automates :", error);
        res.status(500).json({
            error: "Impossible de récupérer les automates"
        });
    }
});

module.exports = router;
