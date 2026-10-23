package org.voleyos.global.gym

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

class GymScreenState {
    var bootTitle by mutableStateOf("")
    var scoreA by mutableStateOf(0)
    var scoreB by mutableStateOf(0)
    var setA by mutableStateOf(0)
    var setB by mutableStateOf(0)
    var service by mutableStateOf("A")
    var timer by mutableStateOf("00:00")
    var setter by mutableStateOf("1")

    fun tick(timer: String): String {
        val parts = timer.split(":")
        if (parts.size != 2) return timer
        val minutes = parts[0].toIntOrNull() ?: 0
        val seconds = parts[1].toIntOrNull() ?: 0
        val totalSeconds = minutes * 60 + seconds + 1
        val m = (totalSeconds / 60) % 60
        val s = totalSeconds % 60
        return "%02d:%02d".format(m, s)
    }
}
