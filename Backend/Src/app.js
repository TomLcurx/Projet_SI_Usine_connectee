const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Route de test pour vérifier que l'API fonctionne
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "L'API fonctionne correctement"
    });
});

module.exports = app;
