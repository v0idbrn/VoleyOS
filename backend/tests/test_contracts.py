from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = Path(__file__).resolve().parents[1] / "app"


def test_license_is_agpl() -> None:
    text = (ROOT / "LICENSE").read_text(encoding="utf-8")
    assert text.startswith("                    GNU AFFERO GENERAL PUBLIC LICENSE")
    assert "Version 3, 19 November 2007" in text


def test_third_party_licenses_present() -> None:
    text = (ROOT / "THIRD_PARTY_LICENSES.md").read_text(encoding="utf-8")
    assert "AGPL" not in text.split("\n")[1]
    assert "openpyxl" in text
    assert "Next.js" in text


def test_no_float_token_in_backend_app() -> None:
    offenders = [
        path.name for path in APP.rglob("*.py") if "float" in path.read_text(encoding="utf-8")
    ]
    assert offenders == []


def test_openapi_contract_exported() -> None:
    spec = (ROOT / "docs" / "openapi.json").read_text(encoding="utf-8")
    assert "/api/v1/modules/{module_slug}/run" in spec
    assert "/api/v1/jobs/webhook/payment" in spec
