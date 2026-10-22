const express = require("express");
const cors = require("cors");

const app = express();
const automateRoutes = require("../routes/automate.route");

app.use(cors());
app.use(express.json());

// Vérifie que l'API fonctionne
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "L'API fonctionne correctement"
    });
});

// Routes des automates
app.use("/api/automates", automateRoutes);

const db = require("./config");

// GET /api/variables : toutes les variables
app.get("/api/variables", async (req, res) => {
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

module.exports = app;
