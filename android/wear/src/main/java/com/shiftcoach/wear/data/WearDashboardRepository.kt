package com.shiftcoach.wear.data

import android.app.Activity
import android.util.Log
import com.shiftcoach.wear.BuildConfig
import com.shiftcoach.wear.model.WearUiState
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit
import org.json.JSONException
import org.json.JSONObject
import kotlin.math.roundToInt

class WearDashboardRepository(private val apiBaseUrl: String) {

    fun loadDashboard(activity: Activity, onUpdate: (WearUiState) -> Unit) {
        Thread {
            try {
                Log.i(
                    TAG,
                    "Wear load start url=$apiBaseUrl wearDevHeader=${BuildConfig.WEAR_DEV_KEY.isNotBlank()}",
                )
                var state = WearUiState()
                // Named lambda (not `push`) — avoids symbol clash with other `push` members in scope.
                val emitUiState: (WearUiState) -> Unit = { next ->
                    activity.runOnUiThread { onUpdate(next) }
                }

                state = fetchActivity(state, emitUiState)
                state = fetchSleep(state, emitUiState)
                state = fetchEngine(state, emitUiState)
                state = fetchShiftLag(state, emitUiState)
                state = fetchMeal(state, emitUiState)
                state = fetchHeartRate(state, emitUiState)

                val secondary = buildReadinessSecondary(state)
                val allFailed =
                    state.activityError &&
                        state.sleepError &&
                        state.engineError &&
                        state.shiftLagError &&
                        state.mealError &&
                        state.heartRateError
                state = state.copy(
                    readinessInsightPrimary = buildReadinessPrimary(state),
                    readinessInsightSecondary = secondary,
                    loadPassFinished = true,
                    lastUpdatedMs = System.currentTimeMillis(),
                    globalLoadFailure = allFailed,
                )
                emitUiState(state)
            } catch (t: Throwable) {
                Log.e(TAG, "Wear dashboard load crashed", t)
                activity.runOnUiThread {
                    onUpdate(
                        WearUiState(
                            loadPassFinished = true,
                            lastUpdatedMs = System.currentTimeMillis(),
                            globalLoadFailure = true,
                            activityError = true,
                            sleepError = true,
                            engineError = true,
                            shiftLagError = true,
                            mealError = true,
                            heartRateError = true,
                        ),
                    )
                }
            }
        }.start()
    }

    private fun fetchActivity(state: WearUiState, push: (WearUiState) -> Unit): WearUiState {
        return try {
            val activityJson = fetchJson(apiBaseUrl + "/api/activity/today")
            val activityObj = activityJson.optJSONObject("activity")
            val steps = activityObj?.optInt("steps", 0) ?: 0
            val activeMinutes = when {
                activityObj?.has("activeMinutes") == true -> activityObj.optInt("activeMinutes", 0)
                activityObj?.has("active_minutes") == true -> activityObj.optInt("active_minutes", 0)
                else -> null
            }
            state.copy(steps = steps, activeMinutes = activeMinutes).also { push(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Activity load failed: ${e.message}", e)
            state.copy(activityError = true).also { push(it) }
        }
    }

    private fun fetchSleep(state: WearUiState, push: (WearUiState) -> Unit): WearUiState {
        return try {
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
            } else {
                null
            }

            val qualityText = quality.takeIf { it.isNotBlank() }

            val next =
                state.copy(
                    sleepLastNightText = sleepText,
                    sleepQualityText = qualityText,
                    sleepTotalMinutes = totalMinutes.takeIf { it > 0 },
                    bodyclockScore = bodyclock,
                )
            next.copy(readinessInsightPrimary = buildReadinessPrimary(next)).also { push(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Sleep load failed: ${e.message}", e)
            state.copy(sleepError = true).also { push(it) }
        }
    }

    private fun fetchEngine(state: WearUiState, push: (WearUiState) -> Unit): WearUiState {
        return try {
            val engine = fetchJson(apiBaseUrl + "/api/engine/today")
            val bingeRisk = engine.optString("binge_risk", "")
            val editorial = bingeRisk.takeIf { it.isNotBlank() }?.let { editorialBingeRisk(it) }
            state.copy(bingeRisk = editorial).also { push(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Engine load failed: ${e.message}", e)
            state.copy(engineError = true).also { push(it) }
        }
    }

    private fun fetchShiftLag(state: WearUiState, push: (WearUiState) -> Unit): WearUiState {
        return try {
            val shiftLag = fetchJson(apiBaseUrl + "/api/shiftlag")
            val score = shiftLag.optDouble("score", 0.0)
            val level = shiftLag.optString("level", "")
            val shiftLagText =
                if (score > 0.0) editorialShiftLagLine(score, level) else null
            state.copy(
                shiftLagText = shiftLagText,
                shiftLagScore = score.takeIf { score > 0.0 },
            ).also { push(it) }
        } catch (e: Exception) {
            Log.e(TAG, "ShiftLag load failed: ${e.message}", e)
            state.copy(shiftLagError = true).also { push(it) }
        }
    }

    private fun fetchMeal(state: WearUiState, push: (WearUiState) -> Unit): WearUiState {
        return try {
            val meal = fetchJson(apiBaseUrl + "/api/meal-timing/today")
            val label = meal.optString("nextMealLabel", "")
            val time = meal.optString("nextMealTime", "")
            val nextMealText = if (label.isNotBlank() && time.isNotBlank()) {
                "$label · $time"
            } else {
                null
            }
            val cardSubtitle = meal.optString("cardSubtitle", "").takeIf { it.isNotBlank() }
            val shiftLabel = meal.optString("shiftLabel", "").takeIf { it.isNotBlank() }
            val nextMealAtIso = meal.optString("nextMealAt", "").takeIf { it.isNotBlank() }

            val next =
                state.copy(
                    nextMealText = nextMealText,
                    nextMealAtIso = nextMealAtIso,
                    mealCardSubtitle = cardSubtitle,
                    shiftPhaseLabel = shiftLabel,
                )
            next.copy(readinessInsightSecondary = buildReadinessSecondary(next)).also { push(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Meal load failed: ${e.message}", e)
            state.copy(mealError = true).also { push(it) }
        }
    }

    private fun fetchHeartRate(state: WearUiState, push: (WearUiState) -> Unit): WearUiState {
        return try {
            val hr = fetchJson(apiBaseUrl + "/api/wearables/heart-rate")
            val status = hr.optString("status", "")
            if (status != "ok") {
                Log.d(TAG, "Wear heart-rate status=$status (${hr.optString("reason", "")})")
                return state.copy(restingBpm = null, avgBpm = null).also { push(it) }
            }
            var resting = positiveIntOrNull(hr, "resting_bpm")
            var avg = positiveIntOrNull(hr, "avg_bpm")
            val nested = hr.optJSONObject("heart")
            if (nested != null) {
                if (resting == null) resting = positiveIntOrNull(nested, "resting_bpm")
                if (avg == null) avg = positiveIntOrNull(nested, "avg_bpm")
            }
            state.copy(restingBpm = resting, avgBpm = avg).also { push(it) }
        } catch (e: Exception) {
            Log.e(TAG, "HeartRate load failed: ${e.message}", e)
            state.copy(heartRateError = true).also { push(it) }
        }
    }

    private fun positiveIntOrNull(obj: JSONObject, key: String): Int? {
        if (!obj.has(key) || obj.isNull(key)) return null
        val v = obj.optInt(key, 0)
        return v.takeIf { it > 0 }
    }

    private fun buildReadinessPrimary(state: WearUiState): String? {
        if (state.sleepError) return null
        val score = state.bodyclockScore ?: return null
        if (score <= 0) return "Prioritize rest before your shift"
        return when {
            score >= 80 -> "Ready for tonight's shift"
            score >= 60 -> "Recovery is moderate"
            score >= 45 -> "Room to improve recovery"
            score >= 30 -> "Sleep pressure is building"
            else -> "Prioritize rest before your shift"
        }
    }

    private fun buildReadinessSecondary(state: WearUiState): String? {
        state.mealCardSubtitle?.let { return it }
        val iso = state.nextMealAtIso ?: return state.nextMealText
        val mealMillis = parseIsoToUtcMillis(iso) ?: return state.nextMealText
        val mins = TimeUnit.MILLISECONDS.toMinutes(mealMillis - System.currentTimeMillis())
        return when {
            mins in 1..90 -> "Fuel in ${mins}m"
            else -> state.nextMealText
        }
    }

    private fun editorialShiftLagLine(score: Double, level: String): String? {
        if (score <= 0.0) return null
        val l = level.lowercase(Locale.US).trim()
        return when {
            l.contains("low") || l.contains("minimal") || l.contains("light") ->
                "Shift drag feels light"
            l.contains("moder") ->
                "Shift pressure is moderate"
            l.contains("high") || l.contains("severe") || l.contains("heavy") ->
                "Heavy lag — ease in gently"
            score.roundToInt() > 0 ->
                "Lag at ${score.roundToInt()} · pace yourself"
            else -> null
        }
    }

    private fun editorialBingeRisk(raw: String): String {
        val r = raw.trim()
        if (r.isEmpty()) return raw
        val l = r.lowercase(Locale.US)
        return when {
            l.contains("low") || l.contains("minimal") ->
                "Eating pattern looks steady"
            l.contains("high") || l.contains("elevated") ->
                "Snacking pressure is up"
            l.contains("moderate") || l.contains("medium") ->
                "Watch late-shift calories"
            else ->
                r.replaceFirstChar { ch ->
                    if (ch.isLowerCase()) ch.titlecase(Locale.getDefault()) else ch.toString()
                }
        }
    }

    private fun parseIsoToUtcMillis(iso: String): Long? {
        val patterns = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSSX",
            "yyyy-MM-dd'T'HH:mm:ssX",
        )
        for (p in patterns) {
            try {
                val sdf = SimpleDateFormat(p, Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                return sdf.parse(iso)?.time
            } catch (_: ParseException) {
                continue
            }
        }
        return null
    }

    private fun fetchJson(urlString: String): JSONObject {
        var connection: HttpURLConnection? = null
        try {
            val url = URL(urlString)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                // Debug: Next.js first-hit compilation can exceed normal mobile timeouts.
                if (BuildConfig.DEBUG) {
                    connectTimeout = 20_000
                    readTimeout = 60_000
                } else {
                    connectTimeout = 8_000
                    readTimeout = 12_000
                }
                setRequestProperty("Accept", "application/json")
                if (BuildConfig.WEAR_DEV_KEY.isNotBlank()) {
                    setRequestProperty("X-ShiftCoach-Wear-Key", BuildConfig.WEAR_DEV_KEY)
                }
            }

            val code = connection.responseCode
            val inputStream: InputStream = if (code in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream ?: connection.inputStream
            }

            val text = inputStream.bufferedReader().use { it.readText() }
            val oneLine = text.replace("\n", " ").trim()
            // Info so Logcat still shows outcomes when the level dropdown is not Verbose/Debug.
            Log.i(TAG, "Wear HTTP $code ${text.length}b ← $urlString")
            if (code !in 200..299) {
                Log.w(TAG, "Wear non-OK body: ${oneLine.take(220)}")
                throw IOException("HTTP $code for $urlString")
            }
            return try {
                JSONObject(text)
            } catch (e: JSONException) {
                Log.e(TAG, "Wear JSON parse failed; snippet: ${oneLine.take(160)}", e)
                throw e
            }
        } finally {
            connection?.disconnect()
        }
    }

    companion object {
        private const val TAG = "ShiftCoachWear"
    }
}
