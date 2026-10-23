package org.voleyos.global

import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Bundle
import android.view.WindowInsets
import android.view.WindowInsetsController
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.annotation.Keep
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.WindowCompat
import org.voleyos.global.gym.GymScreenState

private const val GYM_TITLE_EXTRA = "gym_title"

class GymScreenActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setScreenOrientation()

        val title = intent.getStringExtra(GYM_TITLE_EXTRA)
        if (!title.isNullOrBlank()) {
            // The Compose screen can read state.bootTitle from extras if needed.
        }

        setContent {
            val state = remember { GymScreenState() }
            GymScreenScreen(
                state = state,
                onDismiss = { finish() },
            )
        }
    }

    private fun setScreenOrientation() {
        // Respect the user's system rotation lock; do not hard-force landscape.
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_USER
    }

    companion object {
        @JvmStatic
        @Keep
        fun openGymScreen(context: Context) {
            val intent = Intent(context, GymScreenActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
    }
}

@Composable
private fun GymScreenScreen(
    state: GymScreenState,
    onDismiss: () -> Unit,
) {
    val configuration = LocalConfiguration.current
    val screenLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

    var scoreA by state.scoreA
    var scoreB by state.scoreB
    var setA by state.setA
    var setB by state.setB
    var service by state.service
    var timer by state.timer
    var setter by state.setter

    LaunchedEffect(Unit) {
        if (state.bootTitle.isNotBlank()) {
            // keep title in UI if needed
        }
    }

    MaterialTheme(
        colorScheme = ColorScheme(
            primary = Color(0xFFE11D48),
            onPrimary = Color.White,
            primaryContainer = Color(0xFF7F1D1D),
            secondary = Color(0xFFEAB308),
            onSecondary = Color.Black,
            background = Color(0xFF070709),
            surface = Color(0xFF0F0F12),
            onBackground = Color.White,
            onSurface = Color.White,
        ),
        typography = Typography(),
        content = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(
                            top = WindowInsets.displayCutout.asPaddingValues().calculateTopPadding() + 8.dp,
                            bottom = WindowInsets.displayCutout.asPaddingValues().calculateBottomPadding() + 8.dp,
                        ),
                ) {
                    TopBar(onDismiss = onDismiss)
                    Spacer(modifier = Modifier.weight(0f))

                    if (screenLandscape) {
                        if (state.bootTitle.isNotBlank()) {
                            Text(
                                text = state.bootTitle,
                                style = MaterialTheme.typography.headlineSmall,
                                color = MaterialTheme.colorScheme.onBackground,
                                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp),
                            )
                        }
                        GymScoreboardLandscape(
                            scoreA = scoreA,
                            scoreB = scoreB,
                            setA = setA,
                            setB = setB,
                            service = service,
                            timer = timer,
                            setter = setter,
                            onControl = { action ->
                                when (action) {
                                    GymControl.ScoreAUp -> scoreA = scoreA + 1
                                    GymControl.ScoreADown -> scoreA = (scoreA - 1).coerceAtLeast(0)
                                    GymControl.ScoreBUp -> scoreB = scoreB + 1
                                    GymControl.ScoreBDown -> scoreB = (scoreB - 1).coerceAtLeast(0)
                                    GymControl.SetAUp -> setA = setA + 1
                                    GymControl.SetADown -> setA = (setA - 1).coerceAtLeast(0)
                                    GymControl.SetBUp -> setB = setB + 1
                                    GymControl.SetBDown -> setB = (setB - 1).coerceAtLeast(0)
                                    GymControl.ToggleService -> service = if (service == "A") "B" else "A"
                                    GymControl.AdvanceSet -> {
                                        if (scoreA >= 25 && scoreA - scoreB >= 2) {
                                            setA = setA + 1
                                            scoreA = 0
                                            scoreB = 0
                                            service = if (service == "A") "B" else "A"
                                        }
                                        if (scoreB >= 25 && scoreB - scoreA >= 2) {
                                            setB = setB + 1
                                            scoreA = 0
                                            scoreB = 0
                                            service = if (service == "A") "B" else "A"
                                        }
                                    }
                                    GymControl.ResetSet -> {
                                        scoreA = 0
                                        scoreB = 0
                                        service = if (service == "A") "B" else "A"
                                    }
                                    GymControl.TimerTick -> {
                                        timer = state.tick(timer)
                                    }
                                    GymControl.TimerReset -> {
                                        timer = "00:00"
                                    }
                                    GymControl.SetterUp -> setter = (setter.toInt()).toString()
                                    GymControl.SetterDown -> setter = (setter.toInt() - 1).coerceAtLeast(1).toString()
                                }
                            }
                        )
                    } else {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "Girar el teléfono al modo horizontal para la Pantalla Gigante de Gimnasio",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onBackground,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                    Spacer(modifier = Modifier.weight(0f))
                }
            }
        }
    }
}

@Composable
private fun TopBar(onDismiss: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "VOLEYOS",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.weight(1f))
        FilledTonalButton(onClick = onDismiss, colors = ButtonDefaults.filledTonalButtonColors(containerColor = Color.Transparent)) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = "Cerrar pantalla",
                tint = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@Composable
private fun GymScoreboardLandscape(
    scoreA: Int,
    scoreB: Int,
    setA: Int,
    setB: Int,
    service: String,
    timer: String,
    setter: String,
    onControl: (GymControl) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            TeamColumn(
                label = "Equipo A",
                score = scoreA.toString(),
                setScore = setA.toString(),
                service = if (service == "A") "A" else "",
                onScoreUp = { onControl(GymControl.ScoreAUp) },
                onScoreDown = { onControl(GymControl.ScoreADown) },
                onSetUp = { onControl(GymControl.SetAUp) },
                onSetDown = { onControl(GymControl.SetADown) },
            )
            Spacer(modifier = Modifier.weight(1f))
            TimerColumn(
                timer = timer,
                onTick = { onControl(GymControl.TimerTick) },
                onReset = { onControl(GymControl.TimerReset) },
            )
            Spacer(modifier = Modifier.weight(1f))
            TeamColumn(
                label = "Equipo B",
                score = scoreB.toString(),
                setScore = setB.toString(),
                service = if (service == "B") "B" else "",
                onScoreUp = { onControl(GymControl.ScoreBUp) },
                onScoreDown = { onControl(GymControl.ScoreBDown) },
                onSetUp = { onControl(GymControl.SetBUp) },
                onSetDown = { onControl(GymControl.SetBDown) },
            )
        }
        Spacer(modifier = Modifier.height(32.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            Button(
                onClick = { onControl(GymControl.ToggleService) },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                modifier = Modifier.size(72.dp, 72.dp),
            ) { Text(service, style = MaterialTheme.typography.headlineLarge) }
            Spacer(modifier = Modifier.width(16.dp))
            Button(
                onClick = { onControl(GymControl.AdvanceSet) },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                modifier = Modifier.size(72.dp, 72.dp),
            ) { Text("SET", style = MaterialTheme.typography.titleLarge) }
            Spacer(modifier = Modifier.width(16.dp))
            Button(
                onClick = { onControl(GymControl.ResetSet) },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7F1D1D)),
                modifier = Modifier.size(72.dp, 72.dp),
            ) { Text("RESET", style = MaterialTheme.typography.titleMedium) }
            Spacer(modifier = Modifier.width(16.dp))
            Button(
                onClick = { onControl(GymControl.SetterUp) },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                modifier = Modifier.size(72.dp, 72.dp),
            ) { Text(setter, style = MaterialTheme.typography.headlineLarge, color = Color.Black) }
        }
    }
}

@Composable
private fun TeamColumn(
    label: String,
    score: String,
    setScore: String,
    service: String,
    onScoreUp: () -> Unit,
    onScoreDown: () -> Unit,
    onSetUp: () -> Unit,
    onSetDown: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = score,
            style = MaterialTheme.typography.displayLarge.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.primary,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            FilledTonalButton(onClick = onScoreUp) { Text("+1", style = MaterialTheme.typography.titleLarge) }
            FilledTonalButton(onClick = onScoreDown) { Text("-1", style = MaterialTheme.typography.titleLarge) }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Sets: $setScore",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            FilledTonalButton(onClick = onSetUp) { Text("+SET", style = MaterialTheme.typography.labelLarge) }
            FilledTonalButton(onClick = onSetDown) { Text("-SET", style = MaterialTheme.typography.labelLarge) }
        }
        if (service.isNotEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Surface(
                color = MaterialTheme.colorScheme.primary,
                shape = RoundedCornerShape(12.dp),
            ) {
                Text(
                    text = "Saque: $service",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun TimerColumn(
    timer: String,
    onTick: () -> Unit,
    onReset: () -> Unit,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = timer,
            style = MaterialTheme.typography.displayMedium.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            FilledTonalButton(onClick = onTick) { Text("⏱", style = MaterialTheme.typography.headlineMedium) }
            FilledTonalButton(onClick = onReset) { Text("Reset", style = MaterialTheme.typography.labelMedium) }
        }
    }
}

enum class GymControl {
    ScoreAUp, ScoreADown, ScoreBUp, ScoreBDown,
    SetAUp, SetADown, SetBUp, SetBDown,
    ToggleService, AdvanceSet, ResetSet,
    TimerTick, TimerReset, SetterUp, SetterDown,
}
