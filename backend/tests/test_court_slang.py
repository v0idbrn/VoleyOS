import pytest
from pydantic import ValidationError

from app.services.court_slang import SLANG, SlangRequest, translate_slang


def test_mate_has_all_five_regional_translations() -> None:
    report = translate_slang(SlangRequest(term="mate", origin="AR"))
    assert set(report.translations) == {"AR", "ES", "MX", "BR", "US"}
    assert report.translations["US"] == "kill"
    assert report.related_terms == ["remate", "ace", "tool"]
    assert report.origin == "AR"


def test_lookup_is_case_insensitive_and_strips_spaces() -> None:
    report = translate_slang(SlangRequest(term="  REMATE ", origin="BR"))
    assert report.term == "REMATE"
    assert report.translations["BR"] == "cortada"


def test_accented_term_is_normalized() -> None:
    report = translate_slang(SlangRequest(term="líbero", origin="US"))
    assert report.translations["US"] == "libero"
    assert report.technical_meaning.startswith("Especialista")


def test_dictionary_meets_minimum_size_and_shape() -> None:
    assert len(SLANG) >= 10
    for entry in SLANG.values():
        assert set(entry.translations) == {"AR", "ES", "MX", "BR", "US"}
        assert entry.technical_meaning
        assert entry.related_terms


def test_unknown_term_raises_with_supported_list() -> None:
    with pytest.raises(ValueError, match="Disponibles"):
        translate_slang(SlangRequest(term="bicicleta", origin="MX"))


def test_bad_term_origin_and_extra_field_are_rejected() -> None:
    with pytest.raises(ValidationError):
        SlangRequest(term="", origin="AR")
    with pytest.raises(ValidationError):
        SlangRequest(term="mate", origin="CL")
    with pytest.raises(ValidationError):
        SlangRequest(term="mate", origin="AR", dialect="rioplatense")
