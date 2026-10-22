import asyncio
import math
import time

from pymodbus import FramerType
from pymodbus.simulator import DataType, SimData, SimDevice
from pymodbus.server import StartAsyncTcpServer


# Configuration du simulateur
HOST = "0.0.0.0"
PORT = 5020
UNIT_ID = 1

# Registres de mesure
REGISTRE_TEMPERATURE = 100
REGISTRE_PRESSION = 101
REGISTRE_VITESSE = 102
REGISTRE_ETAT = 103

# Plage des registres de commande
COMMANDE_DEBUT = 110
COMMANDE_FIN = 119


class AutomateSimule:
    def __init__(self):
        self.demarrage = time.time()

        # 200 registres disponibles : adresses 0 à 199.
        # Les registres de commande sont initialisés à zéro.
        registres = SimData(
            address=0,
            count=200,
            values=0,
            datatype=DataType.REGISTERS,
        )

        async def actualiser_registres(
            function_code,
            start_address,
            address,
            count,
            current_registers,
            set_values,
        ):
            # Une écriture est traitée par le simulateur.
            # On ne remplace jamais les valeurs écrites
            # par les calculs des mesures.
            if set_values is not None:
                print(
                    f"Écriture Modbus : adresse de départ "
                    f"{start_address}, valeurs {set_values}"
                )
                return None

            # Calcul des mesures simulées
            t = time.time() - self.demarrage

            temperature = 55 + 15 * math.sin(t / 20)
            pression = 5 + 0.5 * math.sin(t / 12)
            vitesse = 1450 + 100 * math.sin(t / 8)
            etat = 1

            valeurs_mesures = {
                REGISTRE_TEMPERATURE: round(temperature * 10),
                REGISTRE_PRESSION: round(pression * 10),
                REGISTRE_VITESSE: round(vitesse),
                REGISTRE_ETAT: etat,
            }

            # Actualisation uniquement des registres de mesure
            for i in range(len(current_registers)):
                adresse = start_address + i

                if adresse in valeurs_mesures:
                    current_registers[i] = valeurs_mesures[adresse]

            print(
                f"Température : {temperature:.1f} °C | "
                f"Pression : {pression:.1f} bar | "
                f"Vitesse : {vitesse:.0f} tr/min | "
                f"État : {'En marche' if etat else 'Arrêt'}"
            )

            return None

        self.device = SimDevice(
            id=UNIT_ID,
            simdata=[registres],
            action=actualiser_registres,
        )


async def main():
    automate = AutomateSimule()

    print("Démarrage du simulateur Modbus TCP...")
    print(f"Adresse d'écoute : {HOST}:{PORT}")
    print(f"Identifiant Modbus : {UNIT_ID}")
    print("Mesures : registres 100 à 103")
    print(
        f"Commandes : registres {COMMANDE_DEBUT} "
        f"à {COMMANDE_FIN}"
    )
    print("Arrêt : Ctrl+C")

    await StartAsyncTcpServer(
        context=automate.device,
        address=(HOST, PORT),
        framer=FramerType.SOCKET,
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nArrêt du simulateur.")
