"""Module 22 - fan companion: referee signal decoder plus grandstand trivia."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

LOCALES = ("es", "en", "pt")


class GestureInfo(BaseModel):
    gesture: str
    call: dict[str, str]
    why: dict[str, str]
    example: dict[str, str]
    rule: str


GESTURES: dict[str, GestureInfo] = {
    "two_fingers_up": GestureInfo(
        gesture="two_fingers_up",
        call={
            "es": "Doble contacto",
            "en": "Double contact",
            "pt": "Dois toques",
        },
        why={
            "es": "El mismo jugador toco la pelota dos veces seguidas.",
            "en": "The same player touched the ball twice in a row.",
            "pt": "O mesmo jogador tocou a bola duas vezes seguidas.",
        },
        example={
            "es": "Un armador intenta corregir su pase y vuelve a tocarla.",
            "en": "A setter tries to fix the pass and touches it again.",
            "pt": "Um levantador tenta corrigir o passe e toca de novo.",
        },
        rule="FIVB 9.3.3",
    ),
    "forearm_touch": GestureInfo(
        gesture="forearm_touch",
        call={
            "es": "Balon tocado",
            "en": "Ball touched",
            "pt": "Bola tocada",
        },
        why={
            "es": "El balon rozo el brazo o la mano y sale fuera.",
            "en": "The ball brushed an arm or hand and went out.",
            "pt": "A bola raspou o braco ou a mao e saiu.",
        },
        example={
            "es": "Un bloqueo desvia la pelota y el arbitro toca su antebrazo.",
            "en": "A block deflects the ball and the referee touches their forearm.",
            "pt": "Um bloqueio desvia a bola e o arbitro toca o antebraco.",
        },
        rule="FIVB 9.1",
    ),
    "crossed_arms": GestureInfo(
        gesture="crossed_arms",
        call={
            "es": "Fin de set",
            "en": "End of set",
            "pt": "Fim do set",
        },
        why={
            "es": "El set llego a 25 puntos con dos de diferencia, o 15 en el tie-break.",
            "en": "The set reached 25 points with a two-point lead, or 15 in the tie-break.",
            "pt": "O set chegou a 25 pontos com dois de diferenca, ou 15 no tie-break.",
        },
        example={
            "es": "25-23: el arbitro cruza los brazos y se cambia de lado.",
            "en": "25-23: the referee crosses their arms and teams switch sides.",
            "pt": "25-23: o arbitro cruza os bracos e os times trocam de lado.",
        },
        rule="FIVB 6.2 / 6.3",
    ),
    "four_fingers": GestureInfo(
        gesture="four_fingers",
        call={
            "es": "Cuatro toques",
            "en": "Four touches",
            "pt": "Quatro toques",
        },
        why={
            "es": "El equipo toco la pelota cuatro veces antes de devolverla.",
            "en": "The team touched the ball four times before returning it.",
            "pt": "A equipe tocou a bola quatro vezes antes de devolve-la.",
        },
        example={
            "es": "Recepcion, armado, ataque y un bloqueo propio que sigue en juego.",
            "en": "Pass, set, attack and an own block that stays in play.",
            "pt": "Passe, levantamento, ataque e um bloqueio proprio que segue em jogo.",
        },
        rule="FIVB 9.3.1",
    ),
    "hands_twirling": GestureInfo(
        gesture="hands_twirling",
        call={
            "es": "Cambio de cancha",
            "en": "Change of courts",
            "pt": "Troca de quadra",
        },
        why={
            "es": "Los equipos deben cambiar de lado antes del siguiente set.",
            "en": "Teams must switch sides before the next set.",
            "pt": "As equipes devem trocar de lado antes do proximo set.",
        },
        example={
            "es": "Termina el set y el arbitro gira los antebrazos.",
            "en": "The set ends and the referee rotates their forearms.",
            "pt": "O set termina e o arbitro gira os antebracos.",
        },
        rule="FIVB 18.2",
    ),
    "touch_top_net": GestureInfo(
        gesture="touch_top_net",
        call={
            "es": "Toque de red",
            "en": "Net touch",
            "pt": "Toque na rede",
        },
        why={
            "es": "Un jugador toco la banda superior blanca o la antena.",
            "en": "A player touched the top white band or the antenna.",
            "pt": "Um jogador tocou a faixa branca superior ou a antena.",
        },
        example={
            "es": "El bloqueador roza la malla despues del ataque rival.",
            "en": "The blocker brushes the net after the opponent attack.",
            "pt": "O bloqueador roca a rede depois do ataque rival.",
        },
        rule="FIVB 11.3.1",
    ),
    "point_court_line": GestureInfo(
        gesture="point_court_line",
        call={
            "es": "Balon dentro",
            "en": "Ball in",
            "pt": "Bola dentro",
        },
        why={
            "es": "La pelota toco el piso dentro de las lineas.",
            "en": "The ball touched the floor inside the lines.",
            "pt": "A bola tocou o piso dentro das linhas.",
        },
        example={
            "es": "El arbitro senala la linea y autoriza el punto.",
            "en": "The referee points at the line and awards the point.",
            "pt": "O arbitro aponta para a linha e marca o ponto.",
        },
        rule="FIVB 8.4.1",
    ),
    "thumbs_up_out": GestureInfo(
        gesture="thumbs_up_out",
        call={
            "es": "Balon fuera",
            "en": "Ball out",
            "pt": "Bola fora",
        },
        why={
            "es": "La pelota cayo fuera, toco la antena o un objeto externo.",
            "en": "The ball landed out, hit the antenna or an outside object.",
            "pt": "A bola caiu fora, tocou a antena ou um objeto externo.",
        },
        example={
            "es": "El remate pasa por fuera de la antena y el juez levanta el pulgar.",
            "en": "The spike passes outside the antenna and the referee raises a thumb.",
            "pt": "O ataque passa fora da antena e o arbitro levanta o polegar.",
        },
        rule="FIVB 8.4.3",
    ),
}


class TriviaQuestion(BaseModel):
    id: int
    question: dict[str, str]
    options: dict[str, list[str]]
    correct: int
    explanation: dict[str, str]
    rule: str


QUESTIONS: list[TriviaQuestion] = [
    TriviaQuestion(
        id=1,
        question={
            "es": "Se puede salvar la pelota con el pie?",
            "en": "Can a player save the ball with a foot?",
            "pt": "Pode-se salvar a bola com o pe?",
        },
        options={
            "es": ["Si, cualquier parte del cuerpo", "No, solo manos", "Solo el libero"],
            "en": ["Yes, any part of the body", "No, hands only", "Libero only"],
            "pt": ["Sim, qualquer parte do corpo", "Nao, so as maos", "So o libero"],
        },
        correct=0,
        explanation={
            "es": "Cualquier parte del cuerpo puede tocar la pelota en defensa.",
            "en": "Any part of the body may contact the ball in defence.",
            "pt": "Qualquer parte do corpo pode tocar a bola na defesa.",
        },
        rule="FIVB 9.2",
    ),
    TriviaQuestion(
        id=2,
        question={
            "es": "Que pasa si la pelota toca la antena?",
            "en": "What happens if the ball touches the antenna?",
            "pt": "O que acontece se a bola tocar a antena?",
        },
        options={
            "es": ["Sigue el juego", "Es fuera", "Es punto del bloqueo"],
            "en": ["Play continues", "It is out", "Point for the block"],
            "pt": ["O jogo continua", "E fora", "Ponto do bloqueio"],
        },
        correct=1,
        explanation={
            "es": "La antena es parte de la red y el balon queda fuera.",
            "en": "The antenna is part of the net and the ball is out.",
            "pt": "A antena faz parte da rede e a bola esta fora.",
        },
        rule="FIVB 8.4.3",
    ),
    TriviaQuestion(
        id=3,
        question={
            "es": "El libero puede sacar?",
            "en": "Can the libero serve?",
            "pt": "O libero pode sacar?",
        },
        options={
            "es": ["Si, siempre", "No, no puede sacar", "Solo en el tie-break"],
            "en": ["Yes, always", "No, the libero cannot serve", "Only in the tie-break"],
            "pt": ["Sim, sempre", "Nao, o libero nao pode sacar", "So no tie-break"],
        },
        correct=1,
        explanation={
            "es": "El libero no puede completar un ataque ni sacar.",
            "en": "The libero cannot complete an attack or serve.",
            "pt": "O libero nao pode completar um ataque nem sacar.",
        },
        rule="FIVB 19.3.1",
    ),
    TriviaQuestion(
        id=4,
        question={
            "es": "Un set termina 25-24?",
            "en": "Does a set end at 25-24?",
            "pt": "Um set termina em 25-24?",
        },
        options={
            "es": ["Si", "No, hacen falta dos de diferencia", "Depende del saque"],
            "en": ["Yes", "No, a two-point lead is required", "Depends on serve"],
            "pt": ["Sim", "Nao, sao necessarios dois de vantagem", "Depende do saque"],
        },
        correct=1,
        explanation={
            "es": "El set sigue hasta que un equipo saca dos puntos de diferencia.",
            "en": "The set continues until a team leads by two points.",
            "pt": "O set continua ate uma equipe abrir dois pontos.",
        },
        rule="FIVB 6.2",
    ),
    TriviaQuestion(
        id=5,
        question={
            "es": "Cuanto dura el tiempo muerto tecnico en indoor?",
            "en": "How long is a technical timeout in indoor volleyball?",
            "pt": "Quanto dura o tempo tecnico no indoor?",
        },
        options={
            "es": ["30 segundos", "60 segundos", "90 segundos"],
            "en": ["30 seconds", "60 seconds", "90 seconds"],
            "pt": ["30 segundos", "60 segundos", "90 segundos"],
        },
        correct=1,
        explanation={
            "es": "El tiempo tecnico de FIVB dura 60 segundos cuando se aplica.",
            "en": "The FIVB technical timeout lasts 60 seconds when applied.",
            "pt": "O tempo tecnico da FIVB dura 60 segundos quando aplicado.",
        },
        rule="FIVB 15.4",
    ),
]


class FanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    action: Literal["decode", "trivia"] = "trivia"
    gesture: str | None = None
    answers: list[int] = Field(default_factory=list)


class Decision(BaseModel):
    gesture: str
    call: dict[str, str]
    why: dict[str, str]
    example: dict[str, str]
    rule: str


class AnswerResult(BaseModel):
    id: int
    answer: int
    correct: int
    is_correct: bool
    explanation: dict[str, str]
    rule: str


class TriviaReport(BaseModel):
    questions: list[TriviaQuestion]
    answers: list[AnswerResult]
    score: int
    total: int
    rank: str
    message: str


class FanReport(BaseModel):
    decision: Decision | None
    trivia: TriviaReport | None
    message: str


def _public_questions() -> list[TriviaQuestion]:
    return list(QUESTIONS)


def _decode(gesture: str) -> Decision:
    info = GESTURES.get(gesture)
    if info is None:
        raise ValueError(f"unknown referee gesture: {gesture}")
    return Decision(
        gesture=info.gesture,
        call=info.call,
        why=info.why,
        example=info.example,
        rule=info.rule,
    )


def _trivia(answers: list[int]) -> TriviaReport:
    total = len(QUESTIONS)
    if len(answers) > total:
        raise ValueError("too many trivia answers")
    results: list[AnswerResult] = []
    score = 0
    for index, answer in enumerate(answers):
        question = QUESTIONS[index]
        if answer < 0 or answer >= len(question.options["es"]):
            raise ValueError("trivia answer is out of range")
        is_correct = answer == question.correct
        score += int(is_correct)
        results.append(
            AnswerResult(
                id=question.id,
                answer=answer,
                correct=question.correct,
                is_correct=is_correct,
                explanation=question.explanation,
                rule=question.rule,
            )
        )
    answered = len(results)
    if answered == 0:
        rank = "TRIBUNA_NOVATA"
    elif score == total:
        rank = "ORACULO_DE_TRIBUNA"
    elif score * 10 >= total * 7:
        rank = "TRIBUNERO_AVANZADO"
    elif score * 5 >= total * 2:
        rank = "TRIBUNERO"
    else:
        rank = "TRIBUNA_NOVATA"
    return TriviaReport(
        questions=_public_questions(),
        answers=results,
        score=score,
        total=total,
        rank=rank,
        message=f"Trivia de tribuna: {score}/{answered if answered else total} - {rank}.",
    )


def fan_report(request: FanRequest) -> FanReport:
    if request.action == "decode":
        if not request.gesture:
            raise ValueError("gesture is required to decode a referee call")
        decision = _decode(request.gesture)
        return FanReport(
            decision=decision,
            trivia=None,
            message=f"El juez cobro {decision.call['es']} ({decision.rule}).",
        )
    trivia = _trivia(request.answers)
    return FanReport(decision=None, trivia=trivia, message=trivia.message)
