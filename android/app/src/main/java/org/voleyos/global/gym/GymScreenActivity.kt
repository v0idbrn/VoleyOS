package org.voleyos.global.gym

import android.content.Context
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.annotation.Keep
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.delay
import org.voleyos.global.BuildConfig
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Stable entrance to the gym scoreboard. The deprecated experimental Compose
 * variant is archived here only so the desktop verification stack can keep
 * reading the GymScreenActivity symbol from the APK artifact.
 */
@Keep
class GymScreenActivity : ComponentActivity() {

    companion object {
        const val KEY_HOME_TEAM = "home_team"
        const val KEY_AWAY_TEAM = "away_team"
        const val KEY_SET_A = "set_score_a"
        const val KEY_SET_B = "set_score_b"
        const val KEY_SET_COUNT = "set_count"
        const val KEY_SHOW_SET_COUNT = "show_set_count"
        const val KEY_SERVER_SIDE_A = "server_side_a"
        const val KEY_TITLE = "gym_title"

        fun build(
            context: Context,
            homeTeam: String = "LOCAL",
            awayTeam: String = "VISITANTE",
            setScoreA: Long = 0L,
            setScoreB: Long = 0L,
            setCount: Int = 0,
            showSetCount: Boolean = false,
            serverSideA: Boolean = true,
            title: String = ""
        ): Intent = Intent(context, GymScreenActivity::class.java).apply {
            putExtra(KEY_HOME_TEAM, homeTeam)
            putExtra(KEY_AWAY_TEAM, awayTeam)
            putExtra(KEY_SET_A, setScoreA)
            putExtra(KEY_SET_B, setScoreB)
            putExtra(KEY_SET_COUNT, setCount)
            putExtra(KEY_SHOW_SET_COUNT, showSetCount)
            putExtra(KEY_SERVER_SIDE_A, serverSideA)
            if (title.isNotBlank()) putExtra(KEY_TITLE, title)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }

        fun openGymScreen(context: Context) {
            context.startActivity(build(context))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            GymScreenHost(
                homeTeam = intent.getStringExtra(KEY_HOME_TEAM) ?: "LOCAL",
                awayTeam = intent.getStringExtra(KEY_AWAY_TEAM) ?: "VISITANTE",
                setScoreA = intent.getLongExtra(KEY_SET_A, 0L),
                setScoreB = intent.getLongExtra(KEY_SET_B, 0L),
                setCount = intent.getIntExtra(KEY_SET_COUNT, 0),
                showSetCount = intent.getBooleanExtra(KEY_SHOW_SET_COUNT, false),
                serverSideA = intent.getBooleanExtra(KEY_SERVER_SIDE_A, true),
                title = intent.getStringExtra(KEY_TITLE) ?: "",
            )
        }
    }
}

@androidx.compose.runtime.Composable
fun GymScreenHost(
    homeTeam: String,
    awayTeam: String,
    setScoreA: Long,
    setScoreB: Long,
    setCount: Int,
    showSetCount: Boolean,
    serverSideA: Boolean,
    title: String,
) {
    val context = LocalContext.current
    var tick by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var render by remember { mutableStateOf(false) }

    lifecycleScope.launch {
        while (true) {
            delay(1000L)
            tick = System.currentTimeMillis()
            render = true
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().padding(12.dp),
        contentAlignment = Alignment.Center
    ) {
        Dialog(
            onDismissRequest = { },
            properties = DialogProperties(
                usePlatformDefaultWidth = false,
                dismissOnBackPress = false,
                dismissOnClickOutside = false
            )
        ) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = androidx.compose.ui.graphics.Color(0xFF070709)
            ) {
                GymScreenDisplay(
                    homeTeam = homeTeam,
                    awayTeam = awayTeam,
                    setScoreA = setScoreA,
                    setScoreB = setScoreB,
                    setCount = setCount,
                    showSetCount = showSetCount,
                    serverSideA = serverSideA,
                    title = title.ifBlank { context.getString(android.R.string.unknownName) },
                )
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun GymScreenDisplay(
    homeTeam: String,
    awayTeam: String,
    setScoreA: Long,
    setScoreB: Long,
    setCount: Int,
    showSetCount: Boolean,
    serverSideA: Boolean,
    title: String,
) {
    val now = remember(tick) { SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(tick)) }
    val payload = GymScreenPayload(
        title = title,
        homeTeam = homeTeam,
        awayTeam = awayTeam,
        setA = setScoreA,
        setB = setScoreB,
        setCount = setCount,
        showSetCount = showSetCount,
        serverSideA = serverSideA,
    )
    GymScreenRenderer(payload, now)
}

data class GymScreenPayload(
    val title: String,
    val homeTeam: String,
    val awayTeam: String,
    val setA: Long,
    val setB: Long,
    val setCount: Int,
    val showSetCount: Boolean,
    val serverSideA: Boolean,
)
