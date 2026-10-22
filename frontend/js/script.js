"use strict";

const API_URL = "http://127.0.0.1:3000";

/* =====================================================
   OUTILS COMMUNS
===================================================== */

async function envoyerRequete(url, options = {}) {
    const reponse = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
            ...(options.headers || {}),
            "Content-Type": "application/json"
        }
    });

    const texte = await reponse.text();
    let donnees = {};

    try {
        donnees = texte ? JSON.parse(texte) : {};
    } catch {
        throw new Error("Le serveur a renvoyé une réponse invalide.");
    }

    if (!reponse.ok) {
        throw new Error(
            donnees.message ||
            donnees.erreur ||
            donnees.error ||
            `Erreur du serveur (${reponse.status}).`
        );
    }

    return donnees;
}

function afficherMessage(element, texte, erreur = false) {
    if (!element) return;

    element.textContent = texte;
    element.className = erreur ? "message erreur" : "message";
}

/* =====================================================
   CONNEXION
===================================================== */

const formulaireConnexion = document.querySelector("#form-connexion");

if (formulaireConnexion) {
    formulaireConnexion.addEventListener("submit", async (event) => {
        event.preventDefault();

        const identifiant =
            document.querySelector("#identifiant").value.trim();

        const motDePasse =
            document.querySelector("#motDePasse").value;

        const message =
            document.querySelector("#message-connexion");

        const bouton =
            formulaireConnexion.querySelector('button[type="submit"]');

        afficherMessage(message, "");

        bouton.disabled = true;
        bouton.textContent = "Connexion en cours...";

        try {
            await envoyerRequete(`${API_URL}/api/connexion`, {
                method: "POST",
                body: JSON.stringify({
                    identifiant,
                    motDePasse
                })
            });

            // Vérifier que la session est bien enregistrée.
            await envoyerRequete(`${API_URL}/api/session`);

            window.location.assign("pages/dashboard.html");

        } catch (erreur) {
            afficherMessage(
                message,
                erreur instanceof TypeError
                    ? "Impossible de joindre le serveur. Vérifiez que Docker et le backend sont démarrés."
                    : erreur.message,
                true
            );

            bouton.disabled = false;
            bouton.textContent = "Se connecter";
        }
    });
}

/* =====================================================
   CRÉATION DE PROFIL
===================================================== */

const formulaireCreation =
    document.querySelector("#form-creation-profil");

if (formulaireCreation) {
    const selectRole = document.querySelector("#role");
    const zoneCodeAdmin = document.querySelector("#zone-code-admin");
    const champSecret = document.querySelector("#secretAdmin");
    const champMotDePasse =
        document.querySelector("#nouveau-mot-de-passe");
    const champConfirmation =
        document.querySelector("#confirmation-mot-de-passe");
    const message = document.querySelector("#message-creation");
    const bouton =
        formulaireCreation.querySelector('button[type="submit"]');

    function actualiserRole() {
        const adminSelectionne = selectRole.value === "admin";

        zoneCodeAdmin.hidden = !adminSelectionne;
        champSecret.required = adminSelectionne;

        if (!adminSelectionne) {
            champSecret.value = "";
        }
    }

    selectRole.addEventListener("change", actualiserRole);
    actualiserRole();

    formulaireCreation.addEventListener("submit", async (event) => {
        event.preventDefault();

        afficherMessage(message, "");

        if (champMotDePasse.value !== champConfirmation.value) {
            afficherMessage(
                message,
                "Les deux mots de passe ne correspondent pas.",
                true
            );
            return;
        }

        const role = selectRole.value;

        const corps = {
            identifiant: document
                .querySelector("#nouvel-identifiant")
                .value.trim(),
            motDePasse: champMotDePasse.value,
            role
        };

        if (role === "admin") {
            corps.secretAdmin = champSecret.value;
        }

        bouton.disabled = true;
        bouton.textContent = "Création en cours...";

        try {
            await envoyerRequete(`${API_URL}/api/utilisateurs`, {
                method: "POST",
                body: JSON.stringify(corps)
            });

            await envoyerRequete(`${API_URL}/api/connexion`, {
                method: "POST",
                body: JSON.stringify({
                    identifiant: corps.identifiant,
                    motDePasse: corps.motDePasse
                })
            });

            // Le fichier dashboard.html se trouve dans le même dossier.
            window.location.assign("dashboard.html");

        } catch (erreur) {
            afficherMessage(
                message,
                erreur instanceof TypeError
                    ? "Impossible de joindre le serveur. Vérifiez que le backend est démarré."
                    : erreur.message,
                true
            );

            bouton.disabled = false;
            bouton.textContent = "Créer mon profil";
        }
    });
}

/* =====================================================
   TABLEAU DE BORD
===================================================== */

const etatApi = document.querySelector("#etat-api");
const nomUtilisateur = document.querySelector("#nom-utilisateur");
const roleUtilisateur = document.querySelector("#role-utilisateur");
const boutonDeconnexion =
    document.querySelector("#bouton-deconnexion");

const nombreAutomates = document.querySelector("#nombre-automates");
const nombreVariables = document.querySelector("#nombre-variables");
const statutServeur = document.querySelector("#statut-serveur");
const messageMesures = document.querySelector("#message-mesures");

if (etatApi && nomUtilisateur) {
    initialiserDashboard();
}

async function initialiserDashboard() {
    // Vérification de la session.
    try {
        const donnees =
            await envoyerRequete(`${API_URL}/api/session`);

        const utilisateur = donnees.utilisateur;

        nomUtilisateur.textContent = utilisateur.identifiant;

        roleUtilisateur.textContent =
            utilisateur.role === "admin"
                ? "Administrateur"
                : utilisateur.role === "operateur"
                    ? "Opérateur"
                    : utilisateur.role;

    } catch (erreur) {
        if (erreur.message.includes("401")) {
            window.location.replace("../index.html");
            return;
        }

        nomUtilisateur.textContent = "Session indisponible";
        roleUtilisateur.textContent = "Vérifiez le serveur";
        console.error("Erreur de session :", erreur);
    }

    // État du serveur.
    try {
        const donnees =
            await envoyerRequete(`${API_URL}/api/health`);

        if (donnees.status !== "ok") {
            throw new Error("API indisponible.");
        }

        etatApi.textContent = "● Serveur opérationnel";
        statutServeur.textContent = "En ligne";

    } catch (erreur) {
        etatApi.textContent = "● Serveur indisponible";
        statutServeur.textContent = "Hors ligne";
        console.error("Erreur API :", erreur);
    }

    // Variables configurées.
    if (nombreVariables) {
        try {
            const variables =
                await envoyerRequete(`${API_URL}/api/variables`);

            nombreVariables.textContent = variables.length;

            if (messageMesures) {
                messageMesures.textContent = variables.length === 0
                    ? "Aucune variable n'est configurée pour le moment."
                    : `${variables.length} variable(s) configurée(s). L'affichage des mesures en direct reste à connecter.`;
            }

        } catch (erreur) {
            nombreVariables.textContent = "Erreur";

            if (messageMesures) {
                messageMesures.textContent =
                    "Impossible de charger les variables.";
            }

            console.error("Erreur de chargement des variables :", erreur);
        }
    }

    if (nombreAutomates) {
        nombreAutomates.textContent = "À connecter";
    }
}

/* =====================================================
   DÉCONNEXION
===================================================== */

if (boutonDeconnexion) {
    boutonDeconnexion.addEventListener("click", async () => {
        boutonDeconnexion.disabled = true;
        boutonDeconnexion.textContent = "Déconnexion...";

        try {
            await envoyerRequete(`${API_URL}/api/deconnexion`, {
                method: "POST",
                body: JSON.stringify({})
            });

            window.location.assign("../index.html");

        } catch (erreur) {
            alert(`Impossible de se déconnecter : ${erreur.message}`);

            boutonDeconnexion.disabled = false;
            boutonDeconnexion.textContent = "Déconnexion";
        }
    });
}
