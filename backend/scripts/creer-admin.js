const bcrypt = require("bcryptjs");
const db = require("../src/config");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function demander(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
    try {
        const [admins] = await db.query(
            "SELECT id FROM utilisateurs WHERE role = 'admin' LIMIT 1"
        );

        if (admins.length > 0) {
            console.log("Un administrateur existe déjà.");
            return;
        }

        const identifiant = (await demander("Identifiant admin : ")).trim();
        const motDePasse = await demander("Mot de passe admin : ");

        if (!identifiant || identifiant.length > 100) {
            throw new Error("Identifiant invalide.");
        }

        if (motDePasse.length < 2 || motDePasse.length > 72) {
            throw new Error(
                "Le mot de passe doit contenir entre 2 et 72 caractères."
            );
        }

        const hash = await bcrypt.hash(motDePasse, 12);

        await db.query(
            `INSERT INTO utilisateurs
                (identifiant, password_hash, role, actif)
             VALUES (?, ?, 'admin', TRUE)`,
            [identifiant, hash]
        );

        console.log("Compte administrateur créé.");
    } catch (error) {
        console.error("Erreur :", error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await db.end();
    }
}

main();
