"use strict";

const API_URL = "http://127.0.0.1:3000";

/* =====================================================
   OUTILS COMMUNS
===================================================== */

async function envoyerRequete(url, options = {}) {
    const reponse = await fetch(`${API_URL}${url}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
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
            await envoyerRequete(`/api/connexion`, {
                method: "POST",
                body: JSON.stringify({
                    identifiant,
                    motDePasse
                })
            });

            // Vérifier que la session est bien enregistrée.
            await envoyerRequete(`/api/session`);

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
            await envoyerRequete(`/api/utilisateurs`, {
                method: "POST",
                body: JSON.stringify(corps)
            });

            await envoyerRequete(`/api/connexion`, {
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
            await envoyerRequete(`/api/session`);

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
            await envoyerRequete(`/api/health`);

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

    // Variables configurées et dernières mesures
    const mesuresContainer = document.querySelector("#mesures-container");

    async function actualiserMesures() {
        try {
            const variables = await envoyerRequete(
                `/api/variables`
            );

            if (nombreVariables) {
                nombreVariables.textContent = variables.length;
            }

            if (!mesuresContainer) return;

            if (variables.length === 0) {
                mesuresContainer.replaceChildren();

                if (messageMesures) {
                    messageMesures.textContent =
                        "Aucune variable n'est configurée pour le moment.";
                }

                return;
            }

            if (messageMesures) {
                messageMesures.textContent =
                    "Les mesures sont actualisées automatiquement.";
            }

            // Construire les cartes à partir des variables reçues.
            const fragment = document.createDocumentFragment();

            variables.forEach((variable) => {
                const carte = document.createElement("article");
                carte.className = "carte-mesure";

                const titre = document.createElement("h3");
                titre.textContent = variable.nom;

                const valeur = document.createElement("strong");
                valeur.className = "valeur-mesure";

                const unite = variable.unite || "";
                const derniereValeur = variable.derniere_valeur;

                if (
                    derniereValeur === null ||
                    derniereValeur === undefined
                ) {
                    valeur.textContent = "En attente...";
                } else {
                    valeur.textContent =
                        `${Number(derniereValeur).toLocaleString("fr-FR", {
                            maximumFractionDigits: 1
                        })}${unite ? ` ${unite}` : ""}`;
                }

                const date = document.createElement("small");
                date.className = "date-mesure";

                date.textContent = variable.date_derniere_mesure
                    ? `Dernière mesure : ${new Date(
                        variable.date_derniere_mesure
                    ).toLocaleString("fr-FR")}`
                    : "Aucune mesure reçue";

                carte.append(titre, valeur, date);
                fragment.appendChild(carte);
            });

            // Remplacer les anciennes cartes par les nouvelles.
            mesuresContainer.replaceChildren(fragment);

        } catch (erreur) {
            if (messageMesures) {
                messageMesures.textContent =
                    "Impossible de charger les dernières mesures.";
            }

            console.error("Erreur de chargement des mesures :", erreur);
        }
    }

    // Premier chargement, puis actualisation toutes les 2 secondes.
    await actualiserMesures();
    setInterval(actualiserMesures, 2000);

    // Le nombre d'automates sera relié à l'API dans une prochaine étape.
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
            await envoyerRequete(`/api/deconnexion`, {
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

/* ==========================================
   PAGE PARAMÈTRES DU DASHBOARD
   ========================================== */

const listePreferences = document.querySelector("#liste-preferences");

if (listePreferences) {
    initialiserPageParametres();
}

async function initialiserPageParametres() {
    const message = document.querySelector("#message-parametres");
    const boutonEnregistrer = document.querySelector("#bouton-enregistrer-preferences");

    try {
        // 1. Récupérer les informations de l'utilisateur connecté
        const session = await envoyerRequete("/api/session");

        if (session.utilisateur) {
            const nom = document.querySelector("#nom-utilisateur");
            const role = document.querySelector("#role-utilisateur");

            if (nom) {
                nom.textContent = session.utilisateur.identifiant;
            }

            if (role) {
                const roles = {
                    admin: "Administrateur",
                    operateur: "Opérateur",
                    utilisateur: "Utilisateur"
                };

                role.textContent =
                    roles[session.utilisateur.role] ||
                    session.utilisateur.role;
            }
        }

        // 2. Récupérer les variables disponibles
        const variables = await envoyerRequete("/api/variables");

        // 3. Récupérer les préférences déjà enregistrées
        const preferences = await envoyerRequete(
            "/api/preferences-affichage"
        );

        // Associer chaque préférence à son identifiant de variable
        const preferencesParVariable = new Map(
            preferences.map(preference => [
                Number(preference.variable_id),
                preference
            ])
        );

        // Préparer la liste des variables à afficher
        listePreferences.replaceChildren();

        if (variables.length === 0) {
            message.textContent =
                "Aucune variable disponible. Configure d'abord un automate et ses variables.";
            boutonEnregistrer.disabled = true;
            return;
        }

        // 4. Créer une ligne de réglages pour chaque variable
        variables.forEach((variable, index) => {
            const preference = preferencesParVariable.get(
                Number(variable.id)
            );

            const ligne = document.createElement("div");
            ligne.className = "ligne-preference";
            ligne.dataset.variableId = variable.id;

            // Informations de la variable
            const infos = document.createElement("div");
            infos.className = "infos-variable";

            const nomVariable = document.createElement("strong");
            nomVariable.textContent = variable.nom;

            const detailsVariable = document.createElement("small");
            detailsVariable.textContent =
                "Registre " + variable.adresse_registre +
                (variable.unite ? " · " + variable.unite : "");

            infos.append(nomVariable, detailsVariable);

            // Choix de la visibilité
            const labelVisibilite = document.createElement("label");
            labelVisibilite.className =
                "champ-preference champ-visibilite";
            labelVisibilite.textContent = "Afficher";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "preference-visible";
            checkbox.checked = preference
                ? Boolean(preference.visible)
                : true;

            labelVisibilite.appendChild(checkbox);

            // Choix du type d'affichage
            const labelType = document.createElement("label");
            labelType.className = "champ-preference";
            labelType.textContent = "Type d'affichage";

            const selectType = document.createElement("select");
            selectType.className = "preference-type";

            const typesAffichage = [
                { valeur: "valeur", texte: "Valeur simple" },
                { valeur: "carte", texte: "Carte" },
                { valeur: "jauge", texte: "Jauge" },
                { valeur: "graphique", texte: "Graphique" }
            ];

            typesAffichage.forEach(type => {
                const option = document.createElement("option");
                option.value = type.valeur;
                option.textContent = type.texte;
                selectType.appendChild(option);
            });

            selectType.value = preference
                ? preference.type_affichage
                : "carte";

            labelType.appendChild(selectType);

            // Choix de l'ordre d'affichage
            const labelOrdre = document.createElement("label");
            labelOrdre.className = "champ-preference";
            labelOrdre.textContent = "Ordre d'affichage";

            const inputOrdre = document.createElement("input");
            inputOrdre.type = "number";
            inputOrdre.className = "preference-ordre";
            inputOrdre.min = "0";
            inputOrdre.step = "1";
            inputOrdre.required = true;
            inputOrdre.value = preference
                ? preference.ordre_affichage
                : index + 1;

            labelOrdre.appendChild(inputOrdre);

            ligne.append(
                infos,
                labelVisibilite,
                labelType,
                labelOrdre
            );

            listePreferences.appendChild(ligne);
        });

        message.textContent =
            "Modifie les options ci-dessous, puis enregistre tes préférences.";

        boutonEnregistrer.disabled = false;

        // 5. Enregistrer les préférences de l'utilisateur
        boutonEnregistrer.addEventListener("click", async () => {
            const lignes = listePreferences.querySelectorAll(
                ".ligne-preference"
            );

            const nouvellesPreferences = [];
            let formulaireValide = true;

            lignes.forEach(ligne => {
                const champOrdre = ligne.querySelector(
                    ".preference-ordre"
                );

                const ordre = Number(champOrdre.value);

                if (
                    champOrdre.value.trim() === "" ||
                    !Number.isInteger(ordre) ||
                    ordre < 0
                ) {
                    champOrdre.setCustomValidity(
                        "Saisis un nombre entier positif ou nul."
                    );
                    champOrdre.reportValidity();
                    formulaireValide = false;
                    return;
                }

                champOrdre.setCustomValidity("");

                nouvellesPreferences.push({
                    variable_id: Number(ligne.dataset.variableId),
                    visible: ligne.querySelector(
                        ".preference-visible"
                    ).checked,
                    type_affichage: ligne.querySelector(
                        ".preference-type"
                    ).value,
                    ordre_affichage: ordre
                });
            });

            if (!formulaireValide) {
                message.textContent =
                    "Vérifie les ordres d'affichage avant d'enregistrer.";
                return;
            }

            boutonEnregistrer.disabled = true;
            message.textContent = "Enregistrement en cours...";

            try {
                const resultat = await envoyerRequete(
                    "/api/preferences-affichage",
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            preferences: nouvellesPreferences
                        })
                    }
                );

                message.textContent =
                    resultat.message ||
                    "Préférences enregistrées avec succès.";
            } catch (erreur) {
                message.textContent =
                    "Erreur lors de l'enregistrement : " +
                    erreur.message;
            } finally {
                boutonEnregistrer.disabled = false;
            }
        });

    } catch (erreur) {
        console.error(
            "Erreur lors du chargement des paramètres :",
            erreur
        );

        message.textContent =
            "Impossible de charger les paramètres : " +
            erreur.message;
    }
}
