"""Module 41 - five-region volleyball slang dictionary with technical meaning."""

from __future__ import annotations

import unicodedata
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SlangOrigin = Literal["AR", "ES", "MX", "BR", "US"]
ORIGINS = ("AR", "ES", "MX", "BR", "US")


class SlangRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    term: str = Field(min_length=1, max_length=40)
    origin: SlangOrigin


class SlangEntry(BaseModel):
    translations: dict[str, str]
    technical_meaning: str
    usage_example: str
    related_terms: list[str]


class SlangReport(BaseModel):
    term: str
    origin: SlangOrigin
    translations: dict[str, str]
    technical_meaning: str
    usage_example: str
    related_terms: list[str]
    message: str


def _entry(
    ar: str,
    es: str,
    mx: str,
    br: str,
    us: str,
    meaning: str,
    example: str,
    related: list[str],
) -> SlangEntry:
    return SlangEntry(
        translations={"AR": ar, "ES": es, "MX": mx, "BR": br, "US": us},
        technical_meaning=meaning,
        usage_example=example,
        related_terms=related,
    )


SLANG: dict[str, SlangEntry] = {
    "mate": _entry(
        "mate", "remate", "mate", "mate", "kill",
        "Remate potente que cierra el punto sin respuesta.",
        "¡Que mate! Nadie lo pudo defender.",
        ["remate", "ace", "tool"],
    ),
    "pase": _entry(
        "pase", "pase", "pase", "passe", "pass",
        "Primer contacto que entrega el balon al armador.",
        "El pase quedo perfecto para atacar.",
        ["recepcion", "armador", "libero"],
    ),
    "saque": _entry(
        "saque", "saque", "saque", "saque", "serve",
        "Golpe desde la linea de fondo que inicia el rally.",
        "El saque salio fuerte y bajo.",
        ["ace", "defensa", "libero"],
    ),
    "remate": _entry(
        "remate", "remate", "remate", "cortada", "spike",
        "Ataque aereo sobre la red buscando el piso rival.",
        "Remate cruzado al fondo de la cancha.",
        ["mate", "bloqueo", "dink"],
    ),
    "bloqueo": _entry(
        "bloqueo", "bloqueo", "bloqueo", "bloqueio", "block",
        "Acción defensiva en la red para detener el ataque.",
        "El bloqueo cerro la paralela.",
        ["defensa", "remate", "tool"],
    ),
    "defensa": _entry(
        "defensa", "defensa", "defensa", "defesa", "dig",
        "Contacto bajo para salvar un balon atacado.",
        "La defensa mantuvo vivo el rally.",
        ["pase", "libero", "shank"],
    ),
    "armador": _entry(
        "armador", "colocador", "armador", "levantador", "setter",
        "Jugador que organiza el ataque con el segundo contacto.",
        "El armador abrio la red al punta.",
        ["pase", "levantador", "pipe"],
    ),
    "levantador": _entry(
        "armador", "colocador", "armador", "levantador", "setter",
        "Nombre regional del armador que distribuye el juego.",
        "El levantador jugó el pipe en transición.",
        ["armador", "pase", "pipe"],
    ),
    "punta": _entry(
        "punta", "receptor", "punta", "ponteiro", "outside hitter",
        "Atacante de zona 4 que también recibe el saque.",
        "El punta ataco la linea corta.",
        ["remate", "pase", "pipe"],
    ),
    "libero": _entry(
        "libero", "libero", "libero", "libero", "libero",
        "Especialista defensivo con camiseta distinta.",
        "El líbero entró por el central en la rotación.",
        ["defensa", "pase", "recepcion"],
    ),
    "ace": _entry(
        "ace", "ace", "ace", "ace", "ace",
        "Saque que cae sin que el rival pueda controlarlo.",
        "Un ace cerro el set.",
        ["saque", "mate", "defensa"],
    ),
    "pipe": _entry(
        "pipe", "pipe", "pipe", "pipe", "pipe",
        "Ataque de zaguero por zona 6 a ritmo de armador.",
        "El pipe rompio el bloqueo central.",
        ["armador", "punta", "remate"],
    ),
    "shank": _entry(
        "mufa", "fallo", "mufa", "mancada", "shank",
        "Recepción desviada fuera de la zona de armado.",
        "Ese shank dejo el balon en la tribuna.",
        ["pase", "defensa", "recepcion"],
    ),
    "dink": _entry(
        "amague", "finta", "amague", "largadinha", "dink",
        "Toque suave y colocado para sorprender al bloqueo.",
        "El dink cayo en la zona muerta.",
        ["remate", "bloqueo", "tool"],
    ),
    "tool": _entry(
        "mano afuera", "mano y afuera", "mano afuera", "explorar bloqueio", "tool",
        "Golpe que usa las manos del bloqueo para salir fuera.",
        "Pidio el tool y gano el punto.",
        ["remate", "bloqueo", "mate"],
    ),
}


def _normalize(term: str) -> str:
    decomposed = unicodedata.normalize("NFKD", term.strip().lower())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def translate_slang(request: SlangRequest) -> SlangReport:
    entry = SLANG.get(_normalize(request.term))
    if entry is None:
        supported = ", ".join(sorted(SLANG))
        raise ValueError(f"termino no soportado: {request.term}. Disponibles: {supported}")
    return SlangReport(
        term=request.term,
        origin=request.origin,
        translations=entry.translations,
        technical_meaning=entry.technical_meaning,
        usage_example=entry.usage_example,
        related_terms=entry.related_terms,
        message=(
            f"Termino {request.term} traducido para AR/ES/MX/BR/US "
            f"(origen {request.origin})."
        ),
    )
