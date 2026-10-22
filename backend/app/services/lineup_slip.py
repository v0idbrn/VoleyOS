"""Module 16 - FIVB I-VI starting lineup slip with libero window."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator

ROMAN = ("I", "II", "III", "IV", "V", "VI")
ROLES = ("setter", "outside1", "middle1", "opposite", "outside2", "middle2")
PAIRS = (("setter", "opposite"), ("outside1", "outside2"), ("middle1", "middle2"))
BACK_ROW = (1, 5, 6)


class LineupSlipRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    rotation_start: int = Field(default=1, ge=1, le=6)
    setter: int = Field(ge=1, le=99)
    opposite: int = Field(ge=1, le=99)
    outside1: int = Field(ge=1, le=99)
    outside2: int = Field(ge=1, le=99)
    middle1: int = Field(ge=1, le=99)
    middle2: int = Field(ge=1, le=99)
    libero: int = Field(ge=1, le=99)

    @model_validator(mode="after")
    def _unique_shirts(self) -> LineupSlipRequest:
        numbers = [
            self.setter,
            self.opposite,
            self.outside1,
            self.outside2,
            self.middle1,
            self.middle2,
            self.libero,
        ]
        if len(set(numbers)) != len(numbers):
            raise ValueError("shirt numbers must be unique, including the libero")
        return self


class LineupSlot(BaseModel):
    roman: str
    zone: int
    role: str
    number: int
    row: str


class LiberoWindow(BaseModel):
    rotation: int
    zone: int
    middle_number: int
    note: str


class LineupSlipReport(BaseModel):
    rotation_start: int
    lineup: list[LineupSlot]
    service_order: list[int]
    checks: list[str]
    valid: bool
    libero_entry: LiberoWindow
    libero_windows: list[LiberoWindow]
    message: str


def _numbers(request: LineupSlipRequest) -> dict[str, int]:
    return {
        "setter": request.setter,
        "opposite": request.opposite,
        "outside1": request.outside1,
        "outside2": request.outside2,
        "middle1": request.middle1,
        "middle2": request.middle2,
    }


def build_lineup_slip(request: LineupSlipRequest) -> LineupSlipReport:
    numbers = _numbers(request)
    base = [numbers[role] for role in ROLES]
    shifted = (
        base[-(request.rotation_start - 1) :] + base[: 6 - (request.rotation_start - 1)]
        if request.rotation_start > 1
        else base
    )
    slots: list[LineupSlot] = []
    for index, number in enumerate(shifted):
        zone = index + 1
        role = ROLES[index]
        slots.append(
            LineupSlot(
                roman=ROMAN[index],
                zone=zone,
                role=role,
                number=number,
                row="front" if zone in (2, 3, 4) else "back",
            )
        )
    service_order = [slot.number for slot in slots]
    checks: list[str] = []
    for left, right in PAIRS:
        left_index = shifted.index(numbers[left])
        right_index = shifted.index(numbers[right])
        gap = abs(left_index - right_index)
        if gap != 3:
            raise ValueError(f"{left}/{right} must be exactly three service positions apart")
        checks.append(f"{left}/{right}: 3 posiciones exactas")
    libero_windows: list[LiberoWindow] = []
    for slot in slots:
        if slot.role not in ("middle1", "middle2") or slot.zone not in BACK_ROW:
            continue
        libero_windows.append(
            LiberoWindow(
                rotation=slot.zone,
                zone=slot.zone,
                middle_number=slot.number,
                note=(
                    f"L?bero #{request.libero} entra por central #{slot.number} "
                    f"en Z{slot.zone} antes del saque."
                ),
            )
        )
    if not libero_windows:
        raise ValueError(
            "this rotation leaves both middles in the front row; the libero cannot enter"
        )
    return LineupSlipReport(
        rotation_start=request.rotation_start,
        lineup=slots,
        service_order=service_order,
        checks=checks,
        valid=True,
        libero_entry=libero_windows[0],
        libero_windows=libero_windows,
        message=(
            f"Boleta I-VI v?lida para arrancar en R{request.rotation_start}; "
            f"l?bero #{request.libero} entra por Z{libero_windows[0].zone}."
        ),
    )
