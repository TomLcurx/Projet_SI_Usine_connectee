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
    origin: "http://localhost:3000",
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
