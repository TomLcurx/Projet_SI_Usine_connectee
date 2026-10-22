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

module.exports = app;
