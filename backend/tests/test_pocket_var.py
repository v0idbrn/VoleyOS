from app.services.pocket_var import analyze_play, toss_coin, whistle


def test_libero_rule() -> None:
    decision = analyze_play("El líbero armó de dedos delante de la línea de 3 metros")
    assert decision.matched is True
    assert decision.citation == "FIVB 13.3.4 / 19.3.1"
    assert decision.verdict == "FALTA"


def test_net_touch_rule() -> None:
    decision = analyze_play("Toque de red en la banda superior")
    assert "11.3" in decision.citation


def test_invasion_rule() -> None:
    decision = analyze_play("invasión con el pie entero en la línea central")
    assert "11.2.2" in decision.citation


def test_block_rule() -> None:
    decision = analyze_play("manos sobre la red en bloqueo")
    assert "14.3" in decision.citation


def test_screen_rule() -> None:
    decision = analyze_play("pantalla en el saque")
    assert "12.5" in decision.citation


def test_rotation_rule() -> None:
    decision = analyze_play("falta de orden de rotación")
    assert "7.7" in decision.citation


def test_unknown_play() -> None:
    decision = analyze_play("el jugador estornudó")
    assert decision.matched is False
    assert decision.verdict == "REVISAR VIDEO"


def test_toss_coin_has_entropy() -> None:
    result = toss_coin()
    assert result.choice in {"SAQUE", "LADO"}
    assert result.side in {"DERECHA", "IZQUIERDA"}
    assert len(result.entropy_hex) == 32


def test_whistle_cue() -> None:
    cue = whistle()
    assert cue.kind == "whistle"
    assert cue.duration_ms > 0
