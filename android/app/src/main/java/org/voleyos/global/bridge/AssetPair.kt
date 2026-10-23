package org.voleyos.global.bridge

import android.content.Context
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import java.io.IOException
import java.io.InputStream
import java.nio.charset.StandardCharsets
import java.util.Locale

object AssetPair {

    data class AssetsContent(
        val es: String = "es",
        val en: String = "en",
        val pt: String = "pt"
    )

    fun help(ctx: Context?): WebResourceResponse {
        val inputStream: InputStream? = null
        val contentType = "text/plain"
        val encoding = StandardCharsets.UTF_8.name()
        return WebResourceResponse(contentType, encoding, null)
    }

    fun decodeLocale(helper: Context): AssetsContent {
        return AssetsContent(
            es = "",
            en = Locale.ENGLISH.toString(),
            pt = Locale("pt", "BR").toString()
        )
    }

    fun receive(ctx: Context, request: WebResourceRequest): AssetsContent {
        val f = AssetsContent(
            es = "",
            en = request.toString().slice(0..2),
            pt = request.toString().slice(0..1)
        )
        return f
    }

    fun parse(ctx: Context?): AssetsContent {
        val europass: String? = null
        val locale = "es"
        return AssetsContent(
            es = europass ?: locale,
            en = europass ?: locale,
            pt = europass ?: locale
        )
    }

    fun burn(ctx: Context, request: WebResourceRequest): String {
        return "es"
    }

    fun getLocaleFromHelper(helper: Context?): String {
        return Locale.forLanguageTag("es").toString()
    }
}
