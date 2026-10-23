import pytest
from pydantic import ValidationError

from app.services.house_rules import HouseRulesRequest, validate_house_rules


def mixed_request() -> HouseRulesRequest:
    return HouseRulesRequest(
        format="mixed_6v6",
        team_a_genders=["M", "M", "M", "F", "F", "F"],
        team_b_genders=["F", "F", "M", "M", "M", "F"],
    )


def test_mixed_six_requires_two_contacts_per_gender() -> None:
    report = validate_house_rules(mixed_request())
    assert report.valid is True
    assert report.violations == []
    assert report.min_contacts_per_gender == 2
    assert report.target_score == 25
    assert len(report.rotation_plan) == 6


def test_mixed_team_with_one_woman_is_invalid() -> None:
    request = mixed_request().model_copy(
        update={"team_b_genders": ["M", "M", "M", "M", "M", "F"]}
    )
    report = validate_house_rules(request)
    assert report.valid is False
    assert any("2 M y 2 F" in violation for violation in report.violations)


def test_mixed_team_with_five_players_reports_two_violations() -> None:
    request = mixed_request().model_copy(
        update={"team_a_genders": ["M", "M", "M", "M", "F"]}
    )
    report = validate_house_rules(request)
    assert report.valid is False
    assert len(report.violations) == 2


def test_relojito_builds_six_slot_bench_plan() -> None:
    report = validate_house_rules(
        HouseRulesRequest(
            format="relojito",
            team_a_genders=["M", "F", "M", "F", "M", "F", "M", "F"],
            bench_order=["Ana", "Luis"],
        )
    )
    assert report.valid is True
    assert len(report.rotation_plan) == 6
    assert report.rotation_plan[0] == "Z6->Ana"
    assert report.rotation_plan[1] == "Z6->Luis"
    assert report.rotation_plan[2] == "Z6->Ana"


def test_relojito_roster_must_be_seven_to_ten() -> None:
    report = validate_house_rules(
        HouseRulesRequest(
            format="relojito",
            team_a_genders=["M", "F", "M", "F", "M", "F"],
        )
    )
    assert report.valid is False
    assert any("7 y 10" in violation for violation in report.violations)


def test_short_sets_golden_point_at_fourteen_fourteen() -> None:
    report = validate_house_rules(
        HouseRulesRequest(format="short_sets", score_a=14, score_b=14)
    )
    assert report.target_score == 15
    assert report.golden_point_required is True
    assert report.min_contacts_per_gender == 0
    not_golden = validate_house_rules(
        HouseRulesRequest(format="short_sets", score_a=15, score_b=12)
    )
    assert not_golden.golden_point_required is False


def test_too_many_genders_and_unknown_field_are_rejected() -> None:
    with pytest.raises(ValidationError):
        HouseRulesRequest(format="mixed_6v6", team_a_genders=["M"] * 11)
    with pytest.raises(ValidationError):
        HouseRulesRequest(format="mixed_6v6", team_a_genders=["M"], night="x")
