require("dotenv").config();

const app = require("./app");
const { lireAutomates } = require("./poller");

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur démarré sur le port ${PORT}`);

    lireAutomates();
    setInterval(lireAutomates, 2000);
});
