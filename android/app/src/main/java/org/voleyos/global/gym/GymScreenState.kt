package org.voleyos.global.gym

import androidx.annotation.Keep
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

@Keep
class GymScreenState(
    val homeTeam: String = "",
    val awayTeam: String = "",
    val timeText: String = "",
    val setScoreA: Long = 0L,
    val setScoreB: Long = 0L,
    val setCount: Int = 0,
    val serverSideA: Boolean = true
) {
    private val _isServingSideA = MutableStateFlow(serverSideA)
    val isServingSideA: StateFlow<Boolean> = _isServingSideA

    val title: String
        get() = buildString {
            append(homeTeam.ifBlank { "LOCAL" })
            append(" vs.")
            append(awayTeam.ifBlank { "VISITANTE" })
        }

    val setDelta: Long
        get() = (setScoreA - setScoreB).absoluteValue

    companion object {
        fun newBuilder(): Builder = Builder()

        class Builder {
            private var homeTeam: String = ""
            private var awayTeam: String = ""
            private var setScoreA: Long = 0L
            private var setScoreB: Long = 0L
            private var setCount: Int = 0
            private var serverSideA: Boolean = true

            fun homeTeam(value: String) = apply { homeTeam = value }
            fun awayTeam(value: String) = apply { awayTeam = value }
            fun setScoreA(value: Long) = apply { setScoreA = value }
            fun setScoreB(value: Long) = apply { setScoreB = value }
            fun setCount(value: Int) = apply { setCount = value }
            fun serverSideA(value: Boolean) = apply { serverSideA = value }

            fun build(): GymScreenState {
                return GymScreenState(
                    homeTeam = homeTeam,
                    awayTeam = awayTeam,
                    timeText = "",
                    setScoreA = setScoreA,
                    setScoreB = setScoreB,
                    setCount = setCount,
                    serverSideA = serverSideA
                )
            }

            private fun apply(block: Builder.() -> Unit): Builder {
                block()
                return this
            }
        }
    }
}
