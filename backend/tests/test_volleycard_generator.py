from decimal import Decimal

import pytest

from app.services.volleycard_generator import (
    SixAttributes,
    VolleyCardRequest,
    build_volleycard,
)


def attributes(attack: int = 90) -> SixAttributes:
    return SixAttributes(attack=attack, reception=70, serve=80, block=75, defense=65, setting=50)


def request(**overrides: object) -> VolleyCardRequest:
    payload: dict[str, object] = {
        "name": "Valentina Ríos",
        "position": "punta",
        "height_cm": Decimal(190),
        "standing_reach_cm": Decimal(250),
        "jump_cm": Decimal(80),
        "attributes": attributes(),
    }
    payload.update(overrides)
    return VolleyCardRequest(**payload)  # type: ignore[arg-type]


def test_spike_and_block_reach() -> None:
    card = build_volleycard(request())
    assert card.spike_reach_cm == Decimal("330.00")
    assert card.block_reach_cm == Decimal("323.60")


def test_rarity_elite() -> None:
    card = build_volleycard(request())
    assert card.rarity == "ELITE"


def test_rarity_legend() -> None:
    card = build_volleycard(request(jump_cm=Decimal(105), standing_reach_cm=Decimal(255)))
    assert card.rarity == "LEGEND"


def test_rarity_rookie() -> None:
    card = build_volleycard(request(jump_cm=Decimal(40), standing_reach_cm=Decimal(250)))
    assert card.rarity == "ROOKIE"


def test_archetype_from_best_attribute() -> None:
    card = build_volleycard(request(attributes=attributes(attack=99)))
    assert card.archetype == "Francotirador Aéreo"
    card_block = build_volleycard(
        request(
            attributes=SixAttributes(
                attack=10, reception=10, serve=10, block=99, defense=10, setting=10
            )
        )
    )
    assert card_block.archetype == "Muro Carmesí"


def test_radar_has_six_axes() -> None:
    card = build_volleycard(request())
    assert len(card.radar) == 6
    assert card.radar["attack"] == 90


def test_card_id_deterministic() -> None:
    assert build_volleycard(request()).card_id == build_volleycard(request()).card_id


def test_unknown_position() -> None:
    with pytest.raises(ValueError, match="unknown position"):
        build_volleycard(request(position="pivot"))


def test_reach_lower_than_height_rejected() -> None:
    with pytest.raises(ValueError, match="standing reach"):
        build_volleycard(request(standing_reach_cm=Decimal(180)))


def test_unrealistic_reach_rejected() -> None:
    with pytest.raises(ValueError, match="unrealistic"):
        build_volleycard(request(standing_reach_cm=Decimal(290)))
