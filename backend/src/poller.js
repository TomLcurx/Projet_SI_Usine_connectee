const ModbusRTU = require("modbus-serial");
const db = require("./config");

let lectureEnCours = false;

async function lireAutomates() {
    if (lectureEnCours) return;
    lectureEnCours = true;

    try {
        const [automates] = await db.query(`
            SELECT id, nom, adresse_ip, port_modbus, unite_id
            FROM automates
            WHERE actif = TRUE
        `);

        for (const automate of automates) {
            const client = new ModbusRTU();

            try {
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

                const [variables] = await db.query(
                    `SELECT id, nom, adresse_registre,
                            type_registre, type_donnee, unite,
                            facteur_conversion, offset_conversion
                    FROM variables
                    WHERE automate_id = ? AND actif = TRUE`,
                    [automate.id]
                );

                for (const variable of variables) {
                    try {
                        let valeur;
                        const adresseRegistre =
                            variable.adresse_registre;

                        switch (variable.type_registre) {
                            case "holding": {
                                const r =
                                    await client.readHoldingRegisters(
                                        adresseRegistre, 1
                                    );
                                valeur = r.data[0];
                                break;
                            }
                            case "input": {
                                const r =
                                    await client.readInputRegisters(
                                        adresseRegistre, 1
                                    );
                                valeur = r.data[0];
                                break;
                            }
                            case "coil": {
                                const r = await client.readCoils(
                                    adresseRegistre, 1
                                );
                                valeur = r.data[0] ? 1 : 0;
                                break;
                            }
                            case "discrete": {
                                const r =
                                    await client.readDiscreteInputs(
                                        adresseRegistre, 1
                                    );
                                valeur = r.data[0] ? 1 : 0;
                                break;
                            }
                            default:
                                throw new Error(
                                    `Type de registre inconnu : ${variable.type_registre}`
                                );
                        }

                        // Interprétation des valeurs sur 16 bits
                        if (variable.type_donnee === "int16" && valeur > 32767) {
                            valeur -= 65536;
                        }

                        // Application du facteur et de l'offset configurés en base
                        const facteur = Number(variable.facteur_conversion ?? 1);
                        const offset = Number(variable.offset_conversion ?? 0);

                        valeur = valeur * facteur + offset;

                        await db.query(
                            `INSERT INTO mesures (variable_id, valeur)
                             VALUES (?, ?)`,
                            [variable.id, valeur]
                        );

                        console.log(
                            `[${automate.nom}] ${variable.nom} : ${valeur} ${variable.unite || ""}`
                        );
                    } catch (error) {
                        console.error(
                            `Erreur de lecture de ${variable.nom} :`,
                            error.message
                        );
                    }
                }
            } catch (error) {
                console.error(
                    `Connexion impossible à ${automate.nom} :`,
                    error.message
                );
            } finally {
                if (client.isOpen) {
                    client.close(() => {});
                }
            }
        }
    } catch (error) {
        console.error(
            "Erreur du cycle de lecture :",
            error.message
        );
    } finally {
        lectureEnCours = false;
    }
}

module.exports = { lireAutomates };
