package com.shiftcoach.wear

import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.DirectionsWalk
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.MoreTime
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material3.AppScaffold
import androidx.wear.compose.material3.ScreenScaffold
import androidx.wear.compose.material3.TitleCard
import androidx.wear.compose.material3.CardDefaults as WearCardDefaults
import androidx.wear.compose.material3.LinearProgressIndicator
import androidx.wear.compose.material3.LinearProgressIndicatorDefaults
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONException
import org.json.JSONObject

class MainActivity : ComponentActivity() {

    private val apiBaseUrl = BuildConfig.API_BASE_URL

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Keep the UI visible while the user is viewing the app.
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContent {
            ShiftCoachWearScreen(apiBaseUrl = apiBaseUrl, activity = this)
        }
    }
}

private data class WearUiState(
    val activityError: Boolean = false,
    val sleepError: Boolean = false,
    val engineError: Boolean = false,
    val shiftLagError: Boolean = false,
    val mealError: Boolean = false,
    val heartRateError: Boolean = false,

    val steps: Int? = null,
    val activeMinutes: Int? = null,

    val sleepLastNightText: String? = null,
    val sleepQualityText: String? = null,
    val sleepTotalMinutes: Int? = null,

    val restingBpm: Int? = null,
    val avgBpm: Int? = null,

    val bodyclockScore: Int? = null,
    val bingeRisk: String? = null,

    val shiftLagText: String? = null,
    val shiftLagScore: Double? = null,
    val nextMealText: String? = null,
)

@Composable
private fun ShiftCoachWearScreen(apiBaseUrl: String, activity: ComponentActivity) {
    val blueAccent = Color(0xFF20D38A) // Match screenshot: soft green accents
    val labelColor = Color(0xFF9CA3AF)
    val valueColor = Color(0xFFF3F4F6)
    val unknownText = "—"
    val loadingText = stringResource(id = R.string.label_loading)
    val errorText = stringResource(id = R.string.label_error)

    var uiState by remember { mutableStateOf(WearUiState()) }

    val listState = rememberScalingLazyListState()

    LaunchedEffect(Unit) {
        try {
            uiState = WearUiState()
            // If the app was hot-updated, the lazy list can keep its previous scroll position.
            // Force it back to the top so the logo + "Coach Insights" are actually visible.
            try {
                listState.scrollToItem(0)
            } catch (e: Exception) {
                // Don't let scroll failures crash the app (it can happen on some hot-update paths).
                Log.w("ShiftCoachWear", "scrollToItem failed: ${e.message}", e)
            }

            Thread {
                try {
                    var localState = WearUiState()

                localState = try {
                val activityJson = fetchJson(apiBaseUrl + "/api/activity/today")
                val activityObj = activityJson.optJSONObject("activity")
                val steps = activityObj?.optInt("steps", 0) ?: 0
                val activeMinutes = when {
                    activityObj?.has("activeMinutes") == true -> activityObj.optInt("activeMinutes", 0)
                    activityObj?.has("active_minutes") == true -> activityObj.optInt("active_minutes", 0)
                    else -> null
                }
                localState.copy(steps = steps, activeMinutes = activeMinutes).also {
                    activity.runOnUiThread { uiState = it }
                    }
                } catch (e: Exception) {
                    Log.e("ShiftCoachWear", "Activity load failed: ${e.message}", e)
                    localState.copy(activityError = true).also {
                        activity.runOnUiThread { uiState = it }
                    }
                }

                localState = try {
                val sleepOverview = fetchJson(apiBaseUrl + "/api/sleep/overview")
                val metrics = sleepOverview.optJSONObject("metrics")
                val bodyclock = metrics?.optInt("bodyClockScore", 0) ?: 0

                val sleepData = sleepOverview.optJSONObject("sleepData")
                val lastNight = sleepData?.optJSONObject("lastNight")
                val totalMinutes = lastNight?.optInt("totalMinutes", 0) ?: 0
                val quality = lastNight?.optString("quality", "") ?: ""

                val sleepText = if (totalMinutes > 0) {
                    val hours = totalMinutes / 60
                    val mins = totalMinutes % 60
                    "${hours}h ${mins}m"
                } else null

                val qualityText = quality.takeIf { it.isNotBlank() }

                localState.copy(
                    sleepLastNightText = sleepText,
                    sleepQualityText = qualityText,
                    sleepTotalMinutes = totalMinutes.takeIf { it > 0 },
                    bodyclockScore = bodyclock
                ).also {
                    activity.runOnUiThread { uiState = it }
                    }
                } catch (e: Exception) {
                    Log.e("ShiftCoachWear", "Sleep load failed: ${e.message}", e)
                    localState.copy(sleepError = true).also {
                        activity.runOnUiThread { uiState = it }
                    }
                }

                localState = try {
                val engine = fetchJson(apiBaseUrl + "/api/engine/today")
                val bingeRisk = engine.optString("binge_risk", "")
                localState.copy(bingeRisk = bingeRisk.takeIf { it.isNotBlank() }).also {
                    activity.runOnUiThread { uiState = it }
                    }
                } catch (e: Exception) {
                    Log.e("ShiftCoachWear", "Engine load failed: ${e.message}", e)
                    localState.copy(engineError = true).also {
                        activity.runOnUiThread { uiState = it }
                    }
                }

                localState = try {
                val shiftLag = fetchJson(apiBaseUrl + "/api/shiftlag")
                val score = shiftLag.optDouble("score", 0.0)
                val level = shiftLag.optString("level", "")
                val shiftLagText = if (score > 0.0) {
                    val rounded = kotlin.math.round(score).toInt()
                    if (level.isNotBlank()) "${rounded} (${level})" else "$rounded"
                } else null
                localState.copy(shiftLagText = shiftLagText, shiftLagScore = score.takeIf { score > 0.0 }).also {
                    activity.runOnUiThread { uiState = it }
                    }
                } catch (e: Exception) {
                    Log.e("ShiftCoachWear", "ShiftLag load failed: ${e.message}", e)
                    localState.copy(shiftLagError = true).also {
                        activity.runOnUiThread { uiState = it }
                    }
                }

                localState = try {
                val meal = fetchJson(apiBaseUrl + "/api/meal-timing/today")
                val label = meal.optString("nextMealLabel", "")
                val time = meal.optString("nextMealTime", "")
                val nextMealText = if (label.isNotBlank() && time.isNotBlank()) "$label · $time" else null
                localState.copy(nextMealText = nextMealText).also {
                    activity.runOnUiThread { uiState = it }
                    }
                } catch (e: Exception) {
                    Log.e("ShiftCoachWear", "Meal load failed: ${e.message}", e)
                    localState.copy(mealError = true).also {
                        activity.runOnUiThread { uiState = it }
                    }
                }

                localState = try {
                val hr = fetchJson(apiBaseUrl + "/api/google-fit/heart-rate")
                val resting = hr.optInt("resting_bpm", 0)
                val avg = hr.optInt("avg_bpm", 0)
                localState.copy(restingBpm = resting, avgBpm = avg).also {
                    activity.runOnUiThread { uiState = it }
                    }
                } catch (e: Exception) {
                    Log.e("ShiftCoachWear", "HeartRate load failed: ${e.message}", e)
                    localState.copy(heartRateError = true).also {
                        activity.runOnUiThread { uiState = it }
                    }
                }
                } catch (t: Throwable) {
                    // Absolute last-resort safety so the Wear app can't die from a stray background exception.
                    Log.e("ShiftCoachWear", "Wear background thread crashed", t)
                }
            }.start()
        } catch (t: Throwable) {
            Log.e("ShiftCoachWear", "Wear startup failed", t)
        }
    }

    AppScaffold(modifier = Modifier.background(Color(0xFF000000))) {
        ScreenScaffold(
            scrollState = listState,
            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 6.dp),
        ) { contentPadding ->
            ScalingLazyColumn(
                state = listState,
                modifier = Modifier.fillMaxSize(),
                autoCentering = null,
                horizontalAlignment = Alignment.CenterHorizontally,
                contentPadding = contentPadding,
            ) {
                item {
                    LogoHeader(accentColor = blueAccent)
                }

                item {
                    CompactTitleCard(
                        title = "Bodyclock",
                        accentColor = blueAccent,
                        labelColor = labelColor,
                        valueColor = valueColor,
                        contentPadding = 8.dp,
                        showBorder = false,
                        showTitle = false,
                        transparentBackground = true,
                    ) {
                        BodyclockRing(
                            scoreText = when {
                                uiState.sleepError -> errorText
                                uiState.bodyclockScore == null -> loadingText
                                (uiState.bodyclockScore ?: 0) <= 0 -> unknownText
                                else -> uiState.bodyclockScore.toString()
                            },
                            progress = (uiState.bodyclockScore?.coerceIn(0, 100)?.toFloat()?.div(100f)),
                            accentColor = blueAccent,
                            valueColor = valueColor,
                            labelColor = labelColor,
                        )
                    }
                }

                item {
                    CompactTitleCard(
                        title = "Binge Risk",
                        accentColor = blueAccent,
                        labelColor = labelColor,
                        valueColor = valueColor,
                        contentPadding = 8.dp,
                        showBorder = false,
                        showTitle = false,
                    ) {
                        InsightValueRow(
                            icon = FavoriteIcon(),
                            label = "Binge risk",
                            value = when {
                                uiState.engineError -> errorText
                                uiState.bingeRisk == null -> loadingText
                                else -> uiState.bingeRisk ?: unknownText
                            },
                            labelColor = labelColor,
                            valueColor = valueColor,
                            accentColor = blueAccent,
                        )
                    }
                }

                item {
                    CompactTitleCard(
                        title = "Shift Lag",
                        accentColor = blueAccent,
                        labelColor = labelColor,
                        valueColor = valueColor,
                        contentPadding = 8.dp,
                        showBorder = false,
                        showTitle = false,
                    ) {
                        InsightValueRow(
                            icon = MoreTimeIcon(),
                            label = "Shift lag",
                            value = when {
                                uiState.shiftLagError -> errorText
                                uiState.shiftLagText == null -> loadingText
                                else -> uiState.shiftLagText ?: unknownText
                            },
                            labelColor = labelColor,
                            valueColor = valueColor,
                            accentColor = blueAccent,
                            progress = uiState.shiftLagScore?.let { score ->
                                (score.toFloat() / 100f).coerceIn(0f, 1f)
                            },
                        )
                    }
                }

                item {
                    CompactTitleCard(
                        title = "Next Meal",
                        accentColor = blueAccent,
                        labelColor = labelColor,
                        valueColor = valueColor,
                        contentPadding = 8.dp,
                        showBorder = false,
                        showTitle = false,
                    ) {
                        InsightValueRow(
                            icon = RestaurantIcon(),
                            label = "Next meal",
                            value = when {
                                uiState.mealError -> errorText
                                uiState.nextMealText == null -> loadingText
                                else -> uiState.nextMealText ?: unknownText
                            },
                            labelColor = labelColor,
                            valueColor = valueColor,
                            accentColor = blueAccent,
                        )
                    }
                }

                item {
                    CompactTitleCard(
                        title = "Activity",
                        accentColor = blueAccent,
                        labelColor = labelColor,
                        valueColor = valueColor,
                        contentPadding = 8.dp,
                        showBorder = false,
                        showTitle = false,
                    ) {
                        CompactTwoStat(
                            leftLabel = "Steps",
                            leftIcon = DirectionsWalkIcon(),
                            leftValue = when {
                                uiState.activityError -> errorText
                                uiState.steps == null -> loadingText
                                uiState.steps == 0 -> unknownText
                                else -> uiState.steps.toString()
                            },
                            rightLabel = "Active min",
                            rightIcon = TimerIcon(),
                            rightValue = when {
                                uiState.activityError -> errorText
                                uiState.activeMinutes == null -> loadingText
                                else -> uiState.activeMinutes.toString()
                            },
                            leftProgress = uiState.steps?.let { steps -> (steps / 10000f).coerceIn(0f, 1f) },
                            rightProgress = uiState.activeMinutes?.let { mins -> (mins / 120f).coerceIn(0f, 1f) },
                            labelColor = labelColor,
                            valueColor = valueColor,
                            accentColor = blueAccent,
                        )
                    }
                }

                item {
                    CompactTitleCard(
                        title = "Sleep",
                        accentColor = blueAccent,
                        labelColor = labelColor,
                        valueColor = valueColor,
                        contentPadding = 8.dp,
                        showBorder = false,
                        showTitle = false,
                    ) {
                        CompactTwoStat(
                            leftLabel = "Last night",
                            leftIcon = BedtimeIcon(),
                            leftValue = when {
                                uiState.sleepError -> errorText
                                uiState.sleepLastNightText == null -> loadingText
                                else -> uiState.sleepLastNightText ?: unknownText
                            },
                            rightLabel = "Quality",
                            rightIcon = StarIcon(),
                            rightValue = when {
                                uiState.sleepError -> errorText
                                uiState.sleepQualityText == null -> unknownText
                                else -> uiState.sleepQualityText ?: unknownText
                            },
                            leftProgress = uiState.sleepTotalMinutes?.let { mins -> (mins / 480f).coerceIn(0f, 1f) },
                            rightProgress = null,
                            labelColor = labelColor,
                            valueColor = valueColor,
                            accentColor = blueAccent,
                        )
                    }
                }

                item {
                    CompactTitleCard(
                        title = "Heart Rate",
                        accentColor = blueAccent,
                        labelColor = labelColor,
                        valueColor = valueColor,
                        contentPadding = 8.dp,
                        showBorder = false,
                        showTitle = false,
                    ) {
                        CompactTwoStat(
                            leftLabel = "Resting bpm",
                            leftIcon = FavoriteIcon(),
                            leftValue = when {
                                uiState.heartRateError -> errorText
                                uiState.restingBpm == null -> loadingText
                                uiState.restingBpm ?: 0 <= 0 -> unknownText
                                else -> uiState.restingBpm.toString()
                            },
                            rightLabel = "Avg bpm",
                            rightIcon = FitnessCenterIcon(),
                            rightValue = when {
                                uiState.heartRateError -> errorText
                                uiState.avgBpm == null -> loadingText
                                uiState.avgBpm ?: 0 <= 0 -> unknownText
                                else -> uiState.avgBpm.toString()
                            },
                            leftProgress = uiState.restingBpm?.let { bpm -> (bpm / 100f).coerceIn(0f, 1f) },
                            rightProgress = uiState.avgBpm?.let { bpm -> (bpm / 120f).coerceIn(0f, 1f) },
                            labelColor = labelColor,
                            valueColor = valueColor,
                            accentColor = blueAccent,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LogoHeader(accentColor: Color) {
    androidx.compose.material3.Text(
        text = "SHIFTCOACH",
        color = Color.White,
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 16.sp,
        letterSpacing = 0.6.sp,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier.padding(vertical = 4.dp),
    )
}

@Composable
private fun BodyclockRing(
    scoreText: String,
    progress: Float?,
    accentColor: Color,
    valueColor: Color,
    labelColor: Color,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(86.dp)) {
            androidx.compose.material3.CircularProgressIndicator(
                progress = { (progress ?: 0f).coerceIn(0f, 1f) },
                modifier = Modifier.size(86.dp),
                color = accentColor,
                trackColor = accentColor.copy(alpha = 0.2f),
                strokeWidth = 8.dp,
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                androidx.compose.material3.Text(
                    text = scoreText,
                    color = if (scoreText == "—" || scoreText.contains("Error") || scoreText.contains("Loading")) valueColor else accentColor,
                    fontFamily = FontFamily.SansSerif,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    maxLines = 1,
                )
                androidx.compose.material3.Text(
                    text = "/100",
                    color = labelColor,
                    fontFamily = FontFamily.SansSerif,
                    fontSize = 10.sp,
                    maxLines = 1,
                )
            }
        }
        androidx.compose.material3.Text(
            text = "Bodyclock Score",
            color = labelColor,
            fontFamily = FontFamily.SansSerif,
            fontSize = 9.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
        )
    }
}

@Composable
private fun InsightValueRow(
    icon: ImageVector,
    label: String,
    value: String,
    labelColor: Color,
    valueColor: Color,
    accentColor: Color,
    progress: Float? = null,
) {
    CompactStatColumn(
        modifier = Modifier.fillMaxWidth(),
        label = label,
        icon = icon,
        value = value,
        labelColor = labelColor,
        valueColor = valueColor,
        accentColor = accentColor,
        progress = progress,
    )
}

@Composable
private fun CompactTitleCard(
    title: String,
    accentColor: Color,
    labelColor: Color,
    valueColor: Color,
    contentPadding: Dp,
    showBorder: Boolean = true,
    showTitle: Boolean = true,
    transparentBackground: Boolean = false,
    content: @Composable () -> Unit,
) {
    TitleCard(
        onClick = {},
        title = {
            if (showTitle) {
                androidx.compose.material3.Text(
                    text = title.uppercase(),
                    color = accentColor,
                    fontFamily = FontFamily.SansSerif,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 11.sp,
                    letterSpacing = 0.4.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        },
        colors = WearCardDefaults.cardColors(
            containerColor = if (transparentBackground) Color.Transparent else Color(0xFF0F1216),
            contentColor = valueColor,
            titleColor = accentColor,
        ),
        modifier = if (showBorder) {
            Modifier.border(
                width = 1.dp,
                color = accentColor.copy(alpha = 0.4f),
                shape = RoundedCornerShape(22.dp)
            )
        } else {
            Modifier
        },
        contentPadding = PaddingValues(top = 4.dp, bottom = 4.dp, start = 8.dp, end = 8.dp),
        enabled = true,
    ) {
        Box(modifier = Modifier.fillMaxWidth().padding(top = 1.dp)) {
            content()
        }
    }
}

@Composable
private fun CompactTwoStat(
    leftLabel: String,
    leftIcon: ImageVector,
    leftValue: String,
    rightLabel: String,
    rightIcon: ImageVector,
    rightValue: String,
    leftProgress: Float?,
    rightProgress: Float?,
    labelColor: Color,
    valueColor: Color,
    accentColor: Color,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CompactStatColumn(
            modifier = Modifier.weight(1f),
            label = leftLabel,
            icon = leftIcon,
            value = leftValue,
            labelColor = labelColor,
            valueColor = valueColor,
            accentColor = accentColor,
            progress = leftProgress
        )
        CompactStatColumn(
            modifier = Modifier.weight(1f),
            label = rightLabel,
            icon = rightIcon,
            value = rightValue,
            labelColor = labelColor,
            valueColor = valueColor,
            accentColor = accentColor,
            progress = rightProgress
        )
    }
}

@Composable
private fun CompactStatColumn(
    modifier: Modifier,
    label: String,
    icon: ImageVector,
    value: String,
    labelColor: Color,
    valueColor: Color,
    accentColor: Color,
    progress: Float?,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(0.5.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Start
        ) {
            androidx.compose.material3.Icon(
                imageVector = icon,
                contentDescription = null,
                tint = accentColor,
                modifier = Modifier.width(12.dp).height(12.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            androidx.compose.material3.Text(
                text = label,
                color = labelColor,
                fontSize = 10.sp,
                fontWeight = FontWeight.Normal,
                fontFamily = FontFamily.SansSerif,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        androidx.compose.material3.Text(
            text = value,
            color = valueColor,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.SansSerif,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (progress != null) {
            LinearProgressIndicator(
                progress = { progress.coerceIn(0f, 1f) },
                enabled = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .padding(top = 1.dp),
                strokeWidth = 8.dp,
            )
        } else {
            Spacer(modifier = Modifier.height(3.dp))
        }
    }
}

@Composable
private fun CompactGrid4(
    aLabel: String,
    aIcon: ImageVector,
    aValue: String,
    bLabel: String,
    bIcon: ImageVector,
    bValue: String,
    cLabel: String,
    cIcon: ImageVector,
    cValue: String,
    cProgress: Float?,
    dLabel: String,
    dIcon: ImageVector,
    dValue: String,
    labelColor: Color,
    valueColor: Color,
    accentColor: Color,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            CompactStatColumn(
                modifier = Modifier.weight(1f),
                label = aLabel,
                icon = aIcon,
                value = aValue,
                labelColor = labelColor,
                valueColor = valueColor,
                accentColor = accentColor,
                progress = null
            )
            CompactStatColumn(
                modifier = Modifier.weight(1f),
                label = bLabel,
                icon = bIcon,
                value = bValue,
                labelColor = labelColor,
                valueColor = valueColor,
                accentColor = accentColor,
                progress = null
            )
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            CompactStatColumn(
                modifier = Modifier.weight(1f),
                label = cLabel,
                icon = cIcon,
                value = cValue,
                labelColor = labelColor,
                valueColor = valueColor,
                accentColor = accentColor,
                progress = cProgress
            )
            CompactStatColumn(
                modifier = Modifier.weight(1f),
                label = dLabel,
                icon = dIcon,
                value = dValue,
                labelColor = labelColor,
                valueColor = valueColor,
                accentColor = accentColor,
                progress = null
            )
        }
    }
}

@Composable private fun DirectionsWalkIcon(): ImageVector = Icons.Default.DirectionsWalk
@Composable private fun TimerIcon(): ImageVector = Icons.Default.Timer
@Composable private fun BedtimeIcon(): ImageVector = Icons.Default.Bedtime
@Composable private fun StarIcon(): ImageVector = Icons.Default.Star
@Composable private fun FavoriteIcon(): ImageVector = Icons.Default.Favorite
@Composable private fun FitnessCenterIcon(): ImageVector = Icons.Default.FitnessCenter
@Composable private fun RestaurantIcon(): ImageVector = Icons.Default.Restaurant
@Composable private fun MoreTimeIcon(): ImageVector = Icons.Default.MoreTime

private fun fetchJson(urlString: String): JSONObject {
    var connection: HttpURLConnection? = null
    return try {
        val url = URL(urlString)
        connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 6000
            readTimeout = 8000
        }

        val code = connection.responseCode
        val inputStream: InputStream = if (code in 200..299) {
            connection.inputStream
        } else {
            connection.errorStream ?: connection.inputStream
        }

        val text = inputStream.bufferedReader().use { it.readText() }
        JSONObject(text)
    } finally {
        connection?.disconnect()
    }
}
