
import asyncio
import math
import time

from pymodbus import FramerType
from pymodbus.simulator import DataType
from pymodbus.server import StartAsyncTcpServer
from pymodbus.simulator import SimData, SimDevice


# Configuration du simulateur
HOST = "0.0.0.0"
PORT = 5020
UNIT_ID = 1

# Adresses des registres Modbus
REGISTRE_TEMPERATURE = 100
REGISTRE_PRESSION = 101
REGISTRE_VITESSE = 102
REGISTRE_ETAT = 103


class AutomateSimule:
    def __init__(self):
        self.demarrage = time.time()

        # Déclaration de 200 registres, de 0 à 199
        registres = SimData(
            address=0,
            count=200,
            values=0,
            datatype=DataType.REGISTERS,
        )

        # Appelé lorsqu'un client lit ou écrit des registres
        async def actualiser_registres(
            function_code,
            start_address,
            address,
            count,
            current_registers,
            set_values,
        ):
            # On actualise uniquement lors d'une lecture
            if set_values is not None:
                return None

            t = time.time() - self.demarrage

            temperature = 55 + 15 * math.sin(t / 20)
            pression = 5 + 0.5 * math.sin(t / 12)
            vitesse = 1450 + 100 * math.sin(t / 8)
            etat = 1

            valeurs = {
                REGISTRE_TEMPERATURE: round(temperature * 10),
                REGISTRE_PRESSION: round(pression * 10),
                REGISTRE_VITESSE: round(vitesse),
                REGISTRE_ETAT: etat,
            }

            # Mise à jour des registres demandés
            for i in range(len(current_registers)):
                adresse = start_address + i

                if adresse in valeurs:
                    current_registers[i] = valeurs[adresse]

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
    print("Registres simulés : 100 à 103")
    print("En attente de lectures du backend...")
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
