const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const modbusRoutes = require("../routes/modbus.route");
const automateRoutes = require("../routes/automate.route");
const db = require("./config");

const app = express();

// Vérifie que l'utilisateur est connecté
function verifierConnexion(req, res, next) {
    if (!req.session?.utilisateur) {
        return res.status(401).json({
            error: "Vous devez être connecté."
        });
    }

    next();
}

// Vérifie que l'utilisateur est administrateur
function verifierAdmin(req, res, next) {
    if (req.session?.utilisateur?.role !== "admin") {
        return res.status(403).json({
            error: "Accès réservé aux administrateurs."
        });
    }

    next();
}

app.use(cors({
    origin: [
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    credentials: true
}));
app.use(express.json());

// Stockage des sessions dans MariaDB
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "supervision",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "supervision"
});

app.use(session({
    name: "supervision.sid",
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 2 * 60 * 60 * 1000
    }
}));

const limiterConnexion = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false
});

// Vérifie que l'API fonctionne
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "L'API fonctionne correctement"
    });
});

// Créer un compte

app.post("/api/utilisateurs", async (req, res) => {
    try {
        const { identifiant, motDePasse, role, secretAdmin } = req.body;

        // 1. Vérifier les données saisies
        if (
            typeof identifiant !== "string" ||
            typeof motDePasse !== "string" ||
            !identifiant.trim() ||
            identifiant.trim().length > 100 ||
            motDePasse.length < 8 ||
            Buffer.byteLength(motDePasse, "utf8") > 72
        ) {
            return res.status(400).json({
                error: "Identifiant invalide ou mot de passe de 8 caractères minimum requis."
            });
        }

        // 2. Vérifier le rôle choisi
        if (!["admin", "operateur"].includes(role)) {
            return res.status(400).json({
                error: "Le rôle doit être admin ou operateur."
            });
        }

        // 3. Le code secret est obligatoire uniquement pour un admin
        if (role === "admin") {
            if (
                !process.env.ADMIN_CREATION_SECRET ||
                typeof secretAdmin !== "string" ||
                secretAdmin !== process.env.ADMIN_CREATION_SECRET
            ) {
                return res.status(403).json({
                    error: "Code secret administrateur incorrect."
                });
            }
        }

        // 4. Hasher le mot de passe avant de le stocker
        const hash = await bcrypt.hash(motDePasse, 12);

        // 5. Créer le compte ; la base vérifie l'unicité de l'identifiant
        await db.query(
            `INSERT INTO utilisateurs
                (identifiant, password_hash, role, actif)
             VALUES (?, ?, ?, TRUE)`,
            [identifiant.trim(), hash, role]
        );

        return res.status(201).json({
            message: "Compte créé avec succès.",
            identifiant: identifiant.trim(),
            role
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "Cet identifiant est déjà utilisé."
            });
        }

        console.error("Erreur lors de la création du compte :", error);

        return res.status(500).json({
            error: "Impossible de créer le compte."
        });
    }
});

// Connexion
app.post("/api/connexion", limiterConnexion, async (req, res) => {
    try {
        const { identifiant, motDePasse } = req.body;

        if (
            typeof identifiant !== "string" ||
            typeof motDePasse !== "string"
        ) {
            return res.status(400).json({
                error: "Identifiant et mot de passe requis."
            });
        }

        const [utilisateurs] = await db.query(
            `SELECT id, identifiant, password_hash, role, actif
             FROM utilisateurs
             WHERE identifiant = ?
             LIMIT 1`,
            [identifiant.trim()]
        );

        if (
            utilisateurs.length === 0 ||
            !utilisateurs[0].actif ||
            !(await bcrypt.compare(
                motDePasse,
                utilisateurs[0].password_hash
            ))
        ) {
            return res.status(401).json({
                error: "Identifiant ou mot de passe incorrect."
            });
        }

        const utilisateur = utilisateurs[0];

        req.session.regenerate((error) => {
            if (error) {
                console.error("Erreur de session :", error);
                return res.status(500).json({
                    error: "Impossible d'ouvrir la session."
                });
            }

            req.session.utilisateur = {
                id: utilisateur.id,
                identifiant: utilisateur.identifiant,
                role: utilisateur.role
            };

            req.session.save((saveError) => {
                if (saveError) {
                    console.error("Erreur de session :", saveError);
                    return res.status(500).json({
                        error: "Impossible d'enregistrer la session."
                    });
                }

                res.json({
                    message: "Connexion réussie.",
                    utilisateur: req.session.utilisateur
                });
            });
        });
    } catch (error) {
        console.error("Erreur lors de la connexion :", error);
        res.status(500).json({
            error: "Impossible de se connecter."
        });
    }
});

// Vérifier la session en cours
app.get("/api/session", (req, res) => {
    if (!req.session.utilisateur) {
        return res.status(401).json({
            error: "Vous devez être connecté."
        });
    }

    res.json({
        utilisateur: req.session.utilisateur
    });
});

// Déconnexion
app.post("/api/deconnexion", (req, res, next) => {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie("supervision.sid");
        res.json({
            message: "Déconnexion réussie."
        });
    });
});

// Routes existantes des automates
app.use("/api/automates", automateRoutes);
app.use("/api/automates", modbusRoutes);

// GET /api/variables : toutes les variables
app.get("/api/variables", async (req, res) => {
    try {
        const [variables] = await db.query(
            `SELECT
                v.id,
                v.automate_id,
                v.nom,
                v.adresse_registre,
                v.type_registre,
                v.type_donnee,
                v.unite,
                v.actif,
                v.date_creation,
                (
                    SELECT m.valeur
                    FROM mesures m
                    WHERE m.variable_id = v.id
                    ORDER BY m.date_mesure DESC, m.id DESC
                    LIMIT 1
                ) AS derniere_valeur,
                (
                    SELECT m.date_mesure
                    FROM mesures m
                    WHERE m.variable_id = v.id
                    ORDER BY m.date_mesure DESC, m.id DESC
                    LIMIT 1
                ) AS date_derniere_mesure
             FROM variables v
             ORDER BY v.automate_id, v.id`
        );

        res.json(variables);
    } catch (error) {
        console.error(
            "Erreur lors de la récupération des variables :",
            error
        );

        res.status(500).json({
            error: "Impossible de récupérer les variables"
        });
    }
});

/* =====================================================
   HISTORIQUE DES MESURES D'UNE VARIABLE
===================================================== */

app.get(
    "/api/variables/:id/mesures",
    verifierConnexion,
    async (req, res) => {
        const variableId = Number(req.params.id);
        const periodeMinutes = Number(req.query.periode_minutes ?? 60);

        if (
            !Number.isInteger(variableId) ||
            variableId <= 0 ||
            !Number.isInteger(periodeMinutes) ||
            periodeMinutes < 1 ||
            periodeMinutes > 525600
        ) {
            return res.status(400).json({
                error: "Identifiant ou période invalide."
            });
        }

        try {
            const [variables] = await db.query(
                "SELECT id FROM variables WHERE id = ?",
                [variableId]
            );

            if (variables.length === 0) {
                return res.status(404).json({
                    error: "Variable introuvable."
                });
            }

            const dateDebut = new Date(
                Date.now() - periodeMinutes * 60 * 1000
            );

            const [mesures] = await db.query(
                `SELECT valeur, date_mesure
                 FROM mesures
                 WHERE variable_id = ?
                   AND date_mesure >= ?
                 ORDER BY date_mesure ASC
                 LIMIT 2000`,
                [variableId, dateDebut]
            );

            res.json(mesures);
        } catch (error) {
            console.error(
                "Erreur de récupération de l'historique :",
                error
            );

            res.status(500).json({
                error: "Impossible de récupérer les mesures historiques."
            });
        }
    }
);

/* =====================================================
   AFFICHAGES PERSONNALISÉS DU TABLEAU DE BORD
===================================================== */

// Types d'affichage autorisés
const typesAffichageAutorises = [
    "valeur",
    "carte",
    "jauge",
    "graphique"
];

// Récupérer tous les affichages de l'utilisateur connecté
app.get(
    "/api/preferences-affichage",
    verifierConnexion,
    async (req, res) => {
        try {
            const utilisateurId = req.session.utilisateur.id;

            const [affichages] = await db.query(
                `SELECT
                    p.id,
                    p.variable_id,
                    p.titre,
                    p.visible,
                    p.type_affichage,
                    p.ordre_affichage,
                    p.periode_minutes,
                    v.nom AS nom_variable,
                    v.unite,
                    v.automate_id
                 FROM preferences_affichage p
                 INNER JOIN variables v ON v.id = p.variable_id
                 WHERE p.utilisateur_id = ?
                 ORDER BY p.ordre_affichage, p.id`,
                [utilisateurId]
            );

            res.json(affichages);
        } catch (error) {
            console.error(
                "Erreur de récupération des affichages :",
                error
            );

            res.status(500).json({
                error: "Impossible de récupérer les affichages."
            });
        }
    }
);

// Créer un nouvel affichage
app.post(
    "/api/preferences-affichage",
    verifierConnexion,
    async (req, res) => {
        const {
            variable_id,
            titre,
            visible = true,
            type_affichage = "carte",
            ordre_affichage = 0,
            periode_minutes = 60
        } = req.body;

        const variableId = Number(variable_id);
        const ordre = Number(ordre_affichage);
        const periode = Number(periode_minutes);

        if (
            !Number.isInteger(variableId) ||
            variableId <= 0 ||
            !typesAffichageAutorises.includes(type_affichage) ||
            ![true, false, 0, 1].includes(visible) ||
            !Number.isInteger(ordre) ||
            ordre < 0 ||
            !Number.isInteger(periode) ||
            periode < 1 ||
            periode > 525600 ||
            (titre != null &&
                (typeof titre !== "string" ||
                 titre.trim().length > 100))
        ) {
            return res.status(400).json({
                error: "Les paramètres de l'affichage sont invalides."
            });
        }

        try {
            const [resultat] = await db.query(
                `INSERT INTO preferences_affichage
                    (
                        utilisateur_id,
                        variable_id,
                        titre,
                        visible,
                        type_affichage,
                        ordre_affichage,
                        periode_minutes
                    )
                 SELECT ?, id, ?, ?, ?, ?, ?
                 FROM variables
                 WHERE id = ?`,
                [
                    req.session.utilisateur.id,
                    titre?.trim() || null,
                    visible ? 1 : 0,
                    type_affichage,
                    ordre,
                    periode,
                    variableId
                ]
            );

            if (resultat.affectedRows === 0) {
                return res.status(404).json({
                    error: "La variable demandée n'existe pas."
                });
            }

            res.status(201).json({
                message: "Affichage créé avec succès.",
                id: resultat.insertId
            });
        } catch (error) {
            console.error(
                "Erreur de création de l'affichage :",
                error
            );

            res.status(500).json({
                error: "Impossible de créer l'affichage."
            });
        }
    }
);

// Modifier un affichage existant
app.put(
    "/api/preferences-affichage/:id",
    verifierConnexion,
    async (req, res) => {
        const affichageId = Number(req.params.id);

        if (!Number.isInteger(affichageId) || affichageId <= 0) {
            return res.status(400).json({
                error: "Identifiant d'affichage invalide."
            });
        }

        const {
            variable_id,
            titre,
            visible,
            type_affichage,
            ordre_affichage,
            periode_minutes
        } = req.body;

        const variableId = Number(variable_id);
        const ordre = Number(ordre_affichage);
        const periode = Number(periode_minutes);

        if (
            !Number.isInteger(variableId) ||
            variableId <= 0 ||
            !typesAffichageAutorises.includes(type_affichage) ||
            ![true, false, 0, 1].includes(visible) ||
            !Number.isInteger(ordre) ||
            ordre < 0 ||
            !Number.isInteger(periode) ||
            periode < 1 ||
            periode > 525600 ||
            (titre != null &&
                (typeof titre !== "string" ||
                 titre.trim().length > 100))
        ) {
            return res.status(400).json({
                error: "Les paramètres de l'affichage sont invalides."
            });
        }

        try {
            const [resultat] = await db.query(
                `UPDATE preferences_affichage p
                 INNER JOIN variables v ON v.id = ?
                 SET
                    p.variable_id = v.id,
                    p.titre = ?,
                    p.visible = ?,
                    p.type_affichage = ?,
                    p.ordre_affichage = ?,
                    p.periode_minutes = ?
                 WHERE p.id = ?
                   AND p.utilisateur_id = ?`,
                [
                    variableId,
                    titre?.trim() || null,
                    visible ? 1 : 0,
                    type_affichage,
                    ordre,
                    periode,
                    affichageId,
                    req.session.utilisateur.id
                ]
            );

            if (resultat.affectedRows === 0) {
                const [existants] = await db.query(
                    `SELECT id
                     FROM preferences_affichage
                     WHERE id = ?
                       AND utilisateur_id = ?`,
                    [
                        affichageId,
                        req.session.utilisateur.id
                    ]
                );

                if (existants.length === 0) {
                    return res.status(404).json({
                        error: "Affichage introuvable."
                    });
                }

                const [variables] = await db.query(
                    "SELECT id FROM variables WHERE id = ?",
                    [variableId]
                );

                if (variables.length === 0) {
                    return res.status(404).json({
                        error: "La variable demandée n'existe pas."
                    });
                }
            }

            res.json({
                message: "Affichage modifié avec succès."
            });
        } catch (error) {
            console.error(
                "Erreur de modification de l'affichage :",
                error
            );

            res.status(500).json({
                error: "Impossible de modifier l'affichage."
            });
        }
    }
);

// Supprimer un affichage sans supprimer ses mesures
app.delete(
    "/api/preferences-affichage/:id",
    verifierConnexion,
    async (req, res) => {
        const affichageId = Number(req.params.id);

        if (!Number.isInteger(affichageId) || affichageId <= 0) {
            return res.status(400).json({
                error: "Identifiant d'affichage invalide."
            });
        }

        try {
            const [resultat] = await db.query(
                `DELETE FROM preferences_affichage
                 WHERE id = ?
                   AND utilisateur_id = ?`,
                [
                    affichageId,
                    req.session.utilisateur.id
                ]
            );

            if (resultat.affectedRows === 0) {
                return res.status(404).json({
                    error: "Affichage introuvable."
                });
            }

            res.json({
                message: "Affichage supprimé avec succès."
            });
        } catch (error) {
            console.error(
                "Erreur de suppression de l'affichage :",
                error
            );

            res.status(500).json({
                error: "Impossible de supprimer l'affichage."
            });
        }
    }
);

module.exports = app;
