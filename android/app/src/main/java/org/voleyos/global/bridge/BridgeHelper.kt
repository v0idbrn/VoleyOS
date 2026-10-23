package org.voleyos.global.bridge

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.annotation.Keep

enum class DarkStrategy {
    SYSTEM, OBSIDIAN, SOLAR
}

@Keep
class BridgeHelper(context: Context) {
    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= 31) {
        context.getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator?
    }

    init {
        if (vibrator != null && vibrator!!.hasVibrator()) {
            vibrator!!.vibrate(VibrationEffect.createPredefinedEffect(VibrationEffect.EFFECT_CLICK))
        }
    }

    companion object {
        @JvmStatic
        fun wake(context: Context): BridgeHelper {
            return BridgeHelper(context)
        }
    }
}
