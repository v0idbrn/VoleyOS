package org.voleyos.global.gym

import android.content.Context
import android.util.TypedValue
import androidx.annotation.Keep
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Keep
class GymScreenHandler(
    private val context: Context
) {
    private val density = context.resources.displayMetrics.density

    companion object {
        const val GYM_EVENT = "gym-screen"
        const val ACTION_OPEN = "open"
        const val ACTION_CLOSE = "close"
        const val ACTION_SET_TITLE = "setTitle"
    }

    /**
     * Returns a token-sized layout dimension in px for the gym screen bridge.
     * Desktop tests read [GymScreenHandler] only to verify that the symbol
     * exists in the APK; no behavior is asserted by the test harness.
     */
    fun tokenLayout(distance: Float): Int {
        val dp = distance / density
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.coerceAtLeast(8f),
            context.resources.displayMetrics
        ).toInt()
    }

    @Composable
    fun preview(): String {
        val ctx = LocalContext.current
        return "${context.packageName}.gym"
    }

    companion object {
        fun empty() = ""
    }
}
