const express = require("express");
const ModbusRTU = require("modbus-serial");
const db = require("../src/config");

const router = express.Router();

// Récupère les informations de connexion à l'automate.
async function obtenirAutomate(id) {
    const [automates] = await db.query(
        `SELECT id, nom, adresse_ip, port_modbus, unite_id
         FROM automates
         WHERE id = ? AND actif = TRUE`,
        [id]
    );

    return automates[0];
}

// Ouvre une connexion Modbus à l'automate.
async function connecter(automate) {
    const client = new ModbusRTU();

    const adresse =
        automate.adresse_ip === "localhost" ||
        automate.adresse_ip === "127.0.0.1"
            ? "host.docker.internal"
            : automate.adresse_ip;

    await client.connectTCP(adresse, {
        port: automate.port_modbus
    });

    client.setID(automate.unite_id);
    client.setTimeout(2000);

    return client;
}

// GET /api/automates/1/modbus/lecture
// Exemple : ?type=holding&adresse=100&quantite=4
router.get("/:id/modbus/lecture", async (req, res) => {
    let client;

    try {
        const id = Number(req.params.id);
        const adresse = Number(req.query.adresse);
        const quantite = Number(req.query.quantite ?? 1);
        const type = req.query.type ?? "holding";

        if (
            !Number.isInteger(id) || id <= 0 ||
            !Number.isInteger(adresse) ||
            adresse < 0 || adresse > 65535 ||
            !Number.isInteger(quantite) ||
            quantite < 1 || quantite > 125 ||
            adresse + quantite > 65536
        ) {
            return res.status(400).json({
                error: "Identifiant, adresse ou quantité invalide"
            });
        }

        const automate = await obtenirAutomate(id);

        if (!automate) {
            return res.status(404).json({
                error: "Automate introuvable ou inactif"
            });
        }

        client = await connecter(automate);

        let resultat;

        switch (type) {
            case "holding":
                resultat = await client.readHoldingRegisters(
                    adresse, quantite
                );
                break;
            case "input":
                resultat = await client.readInputRegisters(
                    adresse, quantite
                );
                break;
            case "coil":
                resultat = await client.readCoils(adresse, quantite);
                break;
            case "discrete":
                resultat = await client.readDiscreteInputs(
                    adresse, quantite
                );
                break;
            default:
                return res.status(400).json({
                    error: "Type de registre invalide"
                });
        }

        res.json({
            automate: automate.nom,
            type,
            adresse_depart: adresse,
            valeurs: resultat.data.map((valeur, index) => ({
                adresse: adresse + index,
                valeur: valeur
            }))
        });
    } catch (error) {
        console.error("Erreur de lecture Modbus :", error.message);
        res.status(502).json({
            error: "Lecture impossible : " + error.message
        });
    } finally {
        if (client?.isOpen) {
            client.close(() => {});
        }
    }
});

// POST /api/automates/1/modbus/ecriture
// Corps JSON : { "type": "holding", "adresse": 100, "valeur": 42 }
router.post("/:id/modbus/ecriture", async (req, res) => {
    let client;

    try {
        const id = Number(req.params.id);
        const { type, adresse, valeur } = req.body;

        if (
            !Number.isInteger(id) || id <= 0 ||
            !Number.isInteger(adresse) ||
            adresse < 0 || adresse > 65535
        ) {
            return res.status(400).json({
                error: "Identifiant ou adresse invalide"
            });
        }

        if (type === "holding") {
            if (
                !Number.isInteger(valeur) ||
                valeur < 0 || valeur > 65535
            ) {
                return res.status(400).json({
                    error: "La valeur doit être un entier entre 0 et 65535"
                });
            }
        } else if (type === "coil") {
            if (valeur !== 0 && valeur !== 1 &&
                valeur !== true && valeur !== false) {
                return res.status(400).json({
                    error: "Pour une bobine, la valeur doit être 0 ou 1"
                });
            }
        } else {
            return res.status(400).json({
                error: "Écriture autorisée uniquement sur holding ou coil"
            });
        }

        const automate = await obtenirAutomate(id);

        if (!automate) {
            return res.status(404).json({
                error: "Automate introuvable ou inactif"
            });
        }

        client = await connecter(automate);

        let resultat;

        if (type === "holding") {
            resultat = await client.writeRegister(adresse, valeur);
        } else {
            resultat = await client.writeCoil(
                adresse,
                valeur === 1 || valeur === true
            );
        }

        res.json({
            message: "Commande d'écriture envoyée",
            automate: automate.nom,
            type,
            adresse,
            valeur,
            confirmation: resultat
        });
    } catch (error) {
        console.error("Erreur d'écriture Modbus :", error.message);
        res.status(502).json({
            error: "Écriture impossible : " + error.message
        });
    } finally {
        if (client?.isOpen) {
            client.close(() => {});
        }
    }
});

module.exports = router;
