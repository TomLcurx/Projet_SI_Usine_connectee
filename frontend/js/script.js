const API_URL = "http://localhost:3000";

const formulaireConnexion = document.querySelector("#form-connexion");

if (formulaireConnexion) {
    formulaireConnexion.addEventListener("submit", async (event) => {
        event.preventDefault();

        const identifiant = document.querySelector("#identifiant").value.trim();
        const motDePasse = document.querySelector("#motDePasse").value;
        const message = document.querySelector("#message-connexion");
        const bouton = formulaireConnexion.querySelector("button[type='submit']");

        message.textContent = "";
        message.className = "message";
        bouton.disabled = true;
        bouton.textContent = "Connexion en cours...";

        try {
            const reponse = await fetch(`${API_URL}/api/connexion`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    identifiant,
                    motDePasse
                })
            });

            const donnees = await reponse.json();

            if (!reponse.ok) {
                throw new Error(
                    donnees.message || donnees.erreur || "Identifiant ou mot de passe incorrect."
                );
            }

            window.location.href = "pages/dashboard.html";

        } catch (erreur) {
            message.textContent =
                erreur instanceof TypeError
                    ? "Impossible de joindre le serveur. Vérifiez que le backend est démarré."
                    : erreur.message;

            message.classList.add("erreur");

        } finally {
            bouton.disabled = false;
            bouton.textContent = "Se connecter";
        }
    });
}
