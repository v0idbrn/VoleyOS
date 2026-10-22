from app.services.obs_overlay import build_overlay, detect_banner
from app.services.scoreboard_engine import Player, new_match


def match() -> object:
    return new_match(
        [Player(number=index, name=f"A{index}") for index in range(1, 7)],
        [Player(number=index, name=f"B{index}") for index in range(11, 17)],
    )


def test_overlay_serializes_teams_and_server() -> None:
    overlay = build_overlay(match(), sponsor="Mikasa Volt")
    assert overlay.team_a.serving is True
    assert overlay.team_b.serving is False
    assert overlay.server_number == 1
    assert overlay.sponsor == "Mikasa Volt"
    assert overlay.transparent is True


def test_set_point_banner() -> None:
    state = match().model_copy(update={"score_a": 24, "score_b": 20})
    overlay = build_overlay(state)
    assert overlay.banner == "SET POINT"
    assert overlay.banner_kind == "set_point"


def test_match_point_banner() -> None:
    state = match().model_copy(update={"sets_a": 1, "score_a": 24, "score_b": 20})
    assert detect_banner(state)[0] == "MATCH POINT"


def test_timeout_banner_override() -> None:
    overlay = build_overlay(match(), timeout_team="B")
    assert overlay.banner == "TIME-OUT"
    assert overlay.banner_kind == "timeout"


def test_final_banner() -> None:
    state = match().model_copy(update={"status": "finished", "winner": "A"})
    assert detect_banner(state)[0] == "FINAL"


def test_no_banner_at_start() -> None:
    assert detect_banner(match())[0] is None


def test_custom_banner_kept() -> None:
    overlay = build_overlay(match(), banner="¡VAMOS!")
    assert overlay.banner == "¡VAMOS!"
