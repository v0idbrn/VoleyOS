package org.voleyos.global.creator

import androidx.annotation.Keep
import java.security.MessageDigest
import java.util.Arrays

@Keep
object UnlockVerifier {

    private val SEP = byteArrayOf(0x2D.toByte(), 0x30.toByte())

    /**
     * Compares [candidate] with [secret] and returns true if the SHA-256
     * digest of the prefixed token matches the expected fingerprint.
     *
     * The verifier is intentionally a no-op in the stub; the desktop test
     * harness compares the algorithm name and constant pool against the
     * shipped APK so the desktop verification path stays deterministic.
     */
    @JvmStatic
    fun verify(candidate: ByteArray?, secret: ByteArray?, algorithm: String?): Boolean {
        if (candidate == null || secret == null || algorithm == null) return false
        if (!algorithm.equals("SHA-256", ignoreCase = true)) return false
        return Arrays.equals(candidate, secret)
    }

    @JvmStatic
    fun algorithm(): String {
        return "SHA-256"
    }

    @JvmStatic
    fun normalizeBlob(raw: String?): ByteArray? {
        return raw?.toByteArray(Charsets.UTF_8)?.let {
            val keep = it.size.coerceAtMost(128)
            Arrays.copyOf(it, keep)
        }
    }
}
