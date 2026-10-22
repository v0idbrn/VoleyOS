from decimal import Decimal

from app.services.scouting_engine import (
    ScoutEvent,
    efficiency,
    heatmap,
    k1_by_rotation,
    parse_play,
    scouting_report,
)


def test_parse_spanish_play() -> None:
    parsed = parse_play("Saque del 4 al 5, pase A, ataque del 7 por 4 diagonal punto")
    assert parsed.skill == "serve"
    assert parsed.player == 4
    assert parsed.origin_zone == 4
    assert parsed.target_zone == 5
    assert parsed.direction == "diagonal"
    assert parsed.result == "KILL"
    assert parsed.confidence >= Decimal(90)


def test_parse_english_play() -> None:
    parsed = parse_play("attack #7 from zone 4 line to 5 kill")
    assert parsed.skill == "attack"
    assert parsed.player == 7
    assert parsed.origin_zone == 4
    assert parsed.target_zone == 5
    assert parsed.direction == "line"
    assert parsed.result == "KILL"


def test_parse_block_and_error() -> None:
    parsed = parse_play("bloqueo del 3 error")
    assert parsed.skill == "block"
    assert parsed.result == "ERROR"
    assert parsed.player == 3


def test_parse_without_numbers() -> None:
    parsed = parse_play("ataque corta")
    assert parsed.player is None
    assert parsed.direction == "short"
    assert parsed.confidence == Decimal(50)


def test_efficiency_math() -> None:
    events = [
        ScoutEvent(player=1, skill="attack", result="KILL"),
        ScoutEvent(player=2, skill="attack", result="ERROR"),
        ScoutEvent(player=3, skill="attack", result="BLOCKED"),
        ScoutEvent(player=4, skill="attack", result="IN_PLAY"),
    ]
    assert efficiency(events) == Decimal("-0.25")


def test_efficiency_no_attempts() -> None:
    assert efficiency([ScoutEvent(player=1, skill="serve")]) == 0


def test_heatmap_shares_and_heat() -> None:
    events = [ScoutEvent(player=1, target_zone=5) for _ in range(4)]
    events += [ScoutEvent(player=2, target_zone=1), ScoutEvent(player=3, target_zone=9)]
    cells = heatmap(events)
    assert len(cells) == 9
    zone5 = next(cell for cell in cells if cell.zone == 5)
    assert zone5.count == 4
    assert zone5.heat == "volcano"
    assert zone5.share_pct == Decimal("66.67")
    assert abs(sum(cell.share_pct for cell in cells) - Decimal(100)) < Decimal("0.05")


def test_heatmap_empty() -> None:
    cells = heatmap([])
    assert all(cell.count == 0 and cell.share_pct == 0 for cell in cells)


def test_k1_uses_side_out_events() -> None:
    events = [
        ScoutEvent(player=1, rotation=1, side_out=True, result="KILL"),
        ScoutEvent(player=1, rotation=1, side_out=True, result="ERROR"),
        ScoutEvent(player=2, rotation=2, side_out=True, result="KILL"),
    ]
    k1 = k1_by_rotation(events)
    assert k1["R1"] == Decimal("50.00")
    assert k1["R2"] == Decimal("100.00")
    assert "R3" not in k1


def test_scouting_report_flags_cursed_rotation() -> None:
    events = [
        ScoutEvent(player=1, rotation=3, side_out=True, result="ERROR"),
        ScoutEvent(player=1, rotation=3, side_out=True, result="ERROR"),
        ScoutEvent(player=1, rotation=4, side_out=True, result="KILL"),
    ]
    report = scouting_report(events)
    assert report.worst_rotation == "R3"
    assert report.warning is not None
    assert "R3" in report.warning


def test_scouting_report_counts() -> None:
    events = [
        ScoutEvent(player=1, skill="attack", result="KILL"),
        ScoutEvent(player=2, skill="attack", result="ERROR"),
        ScoutEvent(player=3, skill="serve", result="ACE"),
    ]
    report = scouting_report(events)
    assert report.attempts == 2
    assert report.kills == 1
    assert report.errors == 1
    assert report.blocked == 0
