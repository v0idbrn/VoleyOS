package org.voleyos.global.creator

import android.content.Context
import android.content.SharedPreferences
import androidx.annotation.Keep
import org.voleyos.global.BuildConfig
import org.voleyos.global.gym.GymScreenHandler
import java.security.MessageDigest
import java.util.Locale

@Keep
class CreatorService private constructor(
    context: Context
) {
    private val prefs: SharedPreferences = context.getSharedPreferences(
        BuildConfig.APPLICATION_ID + ".creator",
        Context.MODE_PRIVATE
    )

    var unlocked: Boolean
        get() = prefs.getBoolean(KEY_UNLOCKED, false)
        set(value) {
            prefs.edit().putBoolean(KEY_UNLOCKED, value).apply()
        }

    var licenseKeyFingerprint: String
        get() = prefs.getString(KEY_FINGERPRINT, "") ?: ""
        set(value) {
            prefs.edit().putString(KEY_FINGERPRINT, value).apply()
        }

    fun clearSecret() {
        prefs.edit().remove(KEY_FINGERPRINT).apply()
        unlocked = false
    }

    companion object {
        private const val KEY_UNLOCKED = "creator.unlocked"
        private const val KEY_FINGERPRINT = "creator.fingerprint"

        @Volatile
        private var instance: CreatorService? = null

        fun get(context: Context): CreatorService {
            return instance ?: synchronized(this) {
                instance ?: CreatorService(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }
}
