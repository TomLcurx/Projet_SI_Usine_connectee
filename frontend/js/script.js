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

    
    // Affichages personnalisés du tableau de bord
    const mesuresContainer = document.querySelector("#mesures-container");

    async function actualiserMesures() {
        try {
            const [variables, preferences] = await Promise.all([
                envoyerRequete("/api/variables"),
                envoyerRequete("/api/preferences-affichage")
            ]);

            if (nombreVariables) {
                nombreVariables.textContent = variables.length;
            }

            if (!mesuresContainer) return;

            const variablesParId = new Map(
                variables.map(variable => [
                    Number(variable.id),
                    variable
                ])
            );

            const affichagesVisibles = preferences
                .filter(affichage => Boolean(affichage.visible))
                .sort((a, b) =>
                    Number(a.ordre_affichage) - Number(b.ordre_affichage) ||
                    Number(a.id) - Number(b.id)
                );

            mesuresContainer.replaceChildren();

            if (affichagesVisibles.length === 0) {
                afficherMessage(
                    messageMesures,
                    preferences.length === 0
                        ? "Aucun affichage configuré. Rendez-vous dans Personnalisation pour en créer."
                        : "Tous les affichages sont masqués. Modifiez leur visibilité dans Personnalisation."
                );
                return;
            }

            afficherMessage(
                messageMesures,
                "Affichages personnalisés · actualisation automatique"
            );

            for (const affichage of affichagesVisibles) {
                const variable = variablesParId.get(
                    Number(affichage.variable_id)
                );

                if (!variable) continue;

                const carte = document.createElement("article");
                carte.className = "carte-mesure";

                const titre = document.createElement("h3");
                titre.textContent =
                    affichage.titre?.trim() ||
                    affichage.nom_variable ||
                    variable.nom;

                const valeur = document.createElement("strong");
                valeur.className = "valeur-mesure";

                
                const derniereValeur = variable.derniere_valeur;
                const unite = variable.unite || "";

                const valeurDisponible =
                    derniereValeur !== null &&
                    derniereValeur !== undefined &&
                    Number.isFinite(Number(derniereValeur));

                valeur.textContent = valeurDisponible
                    ? `${Number(derniereValeur).toLocaleString("fr-FR", {
                        maximumFractionDigits: 2
                    })}${unite ? ` ${unite}` : ""}`
                    : "En attente…";

                carte.append(titre, valeur);

                const type = affichage.type_affichage;

                if (type === "valeur") {
                    carte.classList.add("affichage-valeur");
                }

                if (type === "carte") {
                    carte.classList.add("affichage-carte");

                    const date = document.createElement("small");
                    date.className = "date-mesure";
                    date.textContent = variable.date_derniere_mesure
                        ? `Dernière mesure : ${new Date(
                            variable.date_derniere_mesure
                        ).toLocaleString("fr-FR")}`
                        : "Aucune mesure reçue";

                    carte.appendChild(date);
                }

                if (type === "jauge") {
                    carte.classList.add("affichage-jauge");

                    const zoneJauge = document.createElement("div");
                    zoneJauge.className = "jauge-zone";

                    const barre = document.createElement("div");
                    barre.className = "jauge-barre";

                    const remplissage = document.createElement("div");
                    remplissage.className = "jauge-remplissage";

                    barre.appendChild(remplissage);
                    zoneJauge.appendChild(barre);

                    const legende = document.createElement("small");
                    legende.className = "legende-jauge";
                    legende.textContent =
                        "Échelle indicative basée sur les mesures historiques";

                    carte.append(zoneJauge, legende);

                    try {
                        const historique = await envoyerRequete(
                            `/api/variables/${variable.id}/mesures?periode_minutes=${Number(affichage.periode_minutes) || 60}`
                        );

                        const valeursHistoriques = historique
                            .map(m => Number(m.valeur))
                            .filter(Number.isFinite);

                        if (valeurDisponible && valeursHistoriques.length > 0) {
                            let min = Math.min(...valeursHistoriques);
                            let max = Math.max(...valeursHistoriques);

                            if (min === max) {
                                const marge = Math.abs(min) * 0.2 || 1;
                                min -= marge;
                                max += marge;
                            }

                            const pourcentage = Math.max(
                                0,
                                Math.min(
                                    100,
                                    (Number(derniereValeur) - min) /
                                    (max - min) * 100
                                )
                            );

                            remplissage.style.width = `${pourcentage}%`;
                            legende.textContent =
                                `Min. ${min.toLocaleString("fr-FR", {
                                    maximumFractionDigits: 2
                                })} · Max. ${max.toLocaleString("fr-FR", {
                                    maximumFractionDigits: 2
                                })}`;
                        } else {
                            remplissage.style.width = "0%";
                            legende.textContent =
                                "En attente de mesures historiques";
                        }
                    } catch (erreur) {
                        legende.textContent =
                            "Historique indisponible pour cette jauge";
                        console.error("Erreur de jauge :", erreur);
                    }
                }

                if (type === "graphique") {
                    carte.classList.add("affichage-graphique");

                    const sousTitre = document.createElement("small");
                    sousTitre.textContent =
                        `Historique des ${affichage.periode_minutes} dernières minutes`;
                    carte.appendChild(sousTitre);

                    try {
                        const historique = await envoyerRequete(
                            `/api/variables/${variable.id}/mesures?periode_minutes=${Number(affichage.periode_minutes) || 60}`
                        );

                        const points = historique
                            .map(m => ({
                                valeur: Number(m.valeur),
                                date: m.date_mesure
                            }))
                            .filter(p => Number.isFinite(p.valeur));

                        if (points.length < 2) {
                            const message = document.createElement("p");
                            message.className = "message";
                            message.textContent =
                                "Pas assez de mesures pour tracer le graphique.";
                            carte.appendChild(message);
                        } else {
                            const svgNS = "http://www.w3.org/2000/svg";
                            const svg = document.createElementNS(svgNS, "svg");

                            svg.setAttribute("viewBox", "0 0 600 220");
                            svg.setAttribute("role", "img");
                            svg.setAttribute(
                                "aria-label",
                                `Évolution de ${titre.textContent}`
                            );
                            svg.classList.add("graphique-svg");

                            const valeurs = points.map(p => p.valeur);
                            let min = Math.min(...valeurs);
                            let max = Math.max(...valeurs);

                            if (min === max) {
                                const marge = Math.abs(min) * 0.1 || 1;
                                min -= marge;
                                max += marge;
                            }

                            const margeX = 12;
                            const margeY = 12;
                            const largeur = 600 - margeX * 2;
                            const hauteur = 220 - margeY * 2;

                            const coordonnees = points.map((point, index) => {
                                const x = margeX +
                                    index / (points.length - 1) * largeur;

                                const y = margeY + hauteur -
                                    (point.valeur - min) / (max - min) * hauteur;

                                return `${x},${y}`;
                            }).join(" ");

                            const ligne = document.createElementNS(
                                svgNS,
                                "polyline"
                            );

                            ligne.setAttribute("points", coordonnees);
                            ligne.setAttribute("fill", "none");
                            ligne.setAttribute("stroke", "currentColor");
                            ligne.setAttribute("stroke-width", "3");
                            ligne.setAttribute("stroke-linejoin", "round");
                            ligne.setAttribute("stroke-linecap", "round");

                            svg.appendChild(ligne);
                            carte.appendChild(svg);

                            const legende = document.createElement("small");
                            legende.className = "legende-graphique";
                            legende.textContent =
                                `${points.length} points · Min. ${min.toLocaleString("fr-FR", {
                                    maximumFractionDigits: 2
                                })} · Max. ${max.toLocaleString("fr-FR", {
                                    maximumFractionDigits: 2
                                })}`;

                            carte.appendChild(legende);
                        }
                    } catch (erreur) {
                        const message = document.createElement("p");
                        message.className = "message erreur";
                        message.textContent = "Impossible de charger le graphique.";
                        carte.appendChild(message);

                        console.error("Erreur de graphique :", erreur);
                    }
                }

                mesuresContainer.appendChild(carte);
            }
        } catch (erreur) {
            afficherMessage(
                messageMesures,
                "Impossible de charger les affichages. Vérifiez votre connexion.",
                true
            );

            console.error("Erreur de chargement du tableau de bord :", erreur);
        }
    }

    await actualiserMesures();

    // Le backend lit les automates plus fréquemment.
    // Inutile de recharger les graphiques à chaque lecture Modbus.
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

/* =====================================================
   PAGE PERSONNALISATION : AFFICHAGES INDÉPENDANTS
===================================================== */

const formulaireAffichage = document.querySelector("#form-affichage");

if (formulaireAffichage) {
    initialiserPersonnalisation();
}

async function initialiserPersonnalisation() {
    const champId = document.querySelector("#affichage-id");
    const champTitre = document.querySelector("#affichage-titre");
    const champVariable = document.querySelector("#affichage-variable");
    const champType = document.querySelector("#affichage-type");
    const champPeriode = document.querySelector("#affichage-periode");
    const champOrdre = document.querySelector("#affichage-ordre");
    const champVisible = document.querySelector("#affichage-visible");

    const titreFormulaire = document.querySelector("#titre-formulaire-affichage");
    const boutonSauvegarder = document.querySelector("#bouton-sauvegarder-affichage");
    const boutonAnnuler = document.querySelector("#bouton-annuler-modification");
    const messageFormulaire = document.querySelector("#message-affichage");
    const messageListe = document.querySelector("#message-liste-affichages");
    const liste = document.querySelector("#liste-affichages");

    let affichages = [];

    try {
        const session = await envoyerRequete("/api/session");
        const utilisateur = session.utilisateur;

        document.querySelector("#nom-utilisateur").textContent =
            utilisateur.identifiant;

        const roles = {
            admin: "Administrateur",
            operateur: "Opérateur",
            utilisateur: "Utilisateur"
        };

        document.querySelector("#role-utilisateur").textContent =
            roles[utilisateur.role] || utilisateur.role;

        const variables = await envoyerRequete("/api/variables");

        champVariable.replaceChildren();

        if (variables.length === 0) {
            champVariable.add(new Option("Aucune variable disponible", ""));
            champVariable.disabled = true;
            boutonSauvegarder.disabled = true;

            afficherMessage(
                messageFormulaire,
                "Configure d'abord un automate et une variable dans Paramètres.",
                true
            );
        } else {
            champVariable.add(new Option("Choisir une variable", ""));

            variables.forEach(variable => {
                const option = new Option(
                    `${variable.nom} — registre ${variable.adresse_registre}`,
                    String(variable.id)
                );

                champVariable.add(option);
            });
        }

        async function chargerAffichages() {
            try {
                affichages = await envoyerRequete(
                    "/api/preferences-affichage"
                );

                liste.replaceChildren();

                if (affichages.length === 0) {
                    afficherMessage(
                        messageListe,
                        "Aucun affichage pour le moment. Crée ton premier affichage ci-dessus."
                    );
                    return;
                }

                afficherMessage(
                    messageListe,
                    `${affichages.length} affichage(s) configuré(s).`
                );

                affichages.forEach(affichage => {
                    const carte = document.createElement("article");
                    carte.className = "ligne-preference";

                    const infos = document.createElement("div");
                    infos.className = "infos-variable";

                    const titre = document.createElement("strong");
                    titre.textContent =
                        affichage.titre ||
                        affichage.nom_variable;

                    const details = document.createElement("small");
                    details.textContent =
                        `Variable : ${affichage.nom_variable} · ` +
                        `Type : ${affichage.type_affichage} · ` +
                        `Période : ${affichage.periode_minutes} min · ` +
                        `Ordre : ${affichage.ordre_affichage} · ` +
                        (affichage.visible ? "Visible" : "Masqué");

                    infos.append(titre, details);

                    const actions = document.createElement("div");
                    actions.className = "actions-parametres";

                    const boutonModifier = document.createElement("button");
                    boutonModifier.type = "button";
                    boutonModifier.className = "bouton-secondaire";
                    boutonModifier.textContent = "Modifier";

                    boutonModifier.addEventListener("click", () => {
                        champId.value = affichage.id;
                        champTitre.value = affichage.titre || "";
                        champVariable.value = String(affichage.variable_id);
                        champType.value = affichage.type_affichage;
                        champPeriode.value = affichage.periode_minutes;
                        champOrdre.value = affichage.ordre_affichage;
                        champVisible.checked = Boolean(affichage.visible);

                        titreFormulaire.textContent = "Modifier un affichage";
                        boutonSauvegarder.textContent = "Enregistrer les modifications";
                        boutonAnnuler.hidden = false;

                        afficherMessage(messageFormulaire, "");
                        formulaireAffichage.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    });

                    const boutonSupprimer = document.createElement("button");
                    boutonSupprimer.type = "button";
                    boutonSupprimer.className = "bouton-secondaire";
                    boutonSupprimer.textContent = "Supprimer";

                    boutonSupprimer.addEventListener("click", async () => {
                        if (!confirm(
                            `Supprimer l'affichage « ${
                                affichage.titre || affichage.nom_variable
                            } » ? Les mesures historiques seront conservées.`
                        )) {
                            return;
                        }

                        boutonSupprimer.disabled = true;

                        try {
                            await envoyerRequete(
                                `/api/preferences-affichage/${affichage.id}`,
                                { method: "DELETE" }
                            );

                            if (champId.value === String(affichage.id)) {
                                reinitialiserFormulaire();
                            }

                            await chargerAffichages();
                        } catch (erreur) {
                            afficherMessage(
                                messageListe,
                                erreur.message,
                                true
                            );
                            boutonSupprimer.disabled = false;
                        }
                    });

                    actions.append(boutonModifier, boutonSupprimer);
                    carte.append(infos, actions);
                    liste.appendChild(carte);
                });
            } catch (erreur) {
                afficherMessage(
                    messageListe,
                    `Impossible de charger les affichages : ${erreur.message}`,
                    true
                );
            }
        }

        function reinitialiserFormulaire() {
            formulaireAffichage.reset();
            champId.value = "";
            champPeriode.value = "60";
            champOrdre.value = String(affichages.length + 1);
            champVisible.checked = true;

            titreFormulaire.textContent = "Nouvel affichage";
            boutonSauvegarder.textContent = "Créer l'affichage";
            boutonAnnuler.hidden = true;

            afficherMessage(messageFormulaire, "");
        }

        boutonAnnuler.addEventListener("click", reinitialiserFormulaire);

        formulaireAffichage.addEventListener("submit", async event => {
            event.preventDefault();

            const variableId = Number(champVariable.value);
            const periode = Number(champPeriode.value);
            const ordre = Number(champOrdre.value);

            if (!variableId) {
                afficherMessage(
                    messageFormulaire,
                    "Choisis une variable.",
                    true
                );
                return;
            }

            if (
                !Number.isInteger(periode) ||
                periode < 1 ||
                periode > 525600 ||
                !Number.isInteger(ordre) ||
                ordre < 0
            ) {
                afficherMessage(
                    messageFormulaire,
                    "La période doit être comprise entre 1 et 525600 minutes et l'ordre doit être un entier positif ou nul.",
                    true
                );
                return;
            }

            const donnees = {
                variable_id: variableId,
                titre: champTitre.value.trim() || null,
                type_affichage: champType.value,
                periode_minutes: periode,
                ordre_affichage: ordre,
                visible: champVisible.checked
            };

            const id = champId.value;
            const url = id
                ? `/api/preferences-affichage/${id}`
                : "/api/preferences-affichage";

            boutonSauvegarder.disabled = true;
            afficherMessage(messageFormulaire, "Enregistrement en cours...");

            try {
                const resultat = await envoyerRequete(url, {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(donnees)
                });

                afficherMessage(
                    messageFormulaire,
                    resultat.message || "Affichage enregistré."
                );

                reinitialiserFormulaire();
                await chargerAffichages();
            } catch (erreur) {
                afficherMessage(
                    messageFormulaire,
                    `Erreur : ${erreur.message}`,
                    true
                );
            } finally {
                boutonSauvegarder.disabled = false;
            }
        });

        await chargerAffichages();

    } catch (erreur) {
        afficherMessage(
            messageFormulaire,
            `Impossible de charger la page : ${erreur.message}`,
            true
        );

        if (erreur.message.includes("401")) {
            window.location.replace("../index.html");
        }
    }
}
