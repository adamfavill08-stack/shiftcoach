package com.shiftcoach.app

import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.temporal.ChronoUnit
import org.json.JSONArray
import org.json.JSONObject

/**
 * Health Connect `SleepSessionRecord` → JSON for `/api/health-connect/sync`.
 * Targets `androidx.health.connect:connect-client:1.1.0` (SleepSessionRecord, Metadata.dataOrigin, stages).
 * One bad session never fails the whole batch; `stages` is always a JSON array (possibly empty).
 */
object HealthConnectSleepJson {
    private const val TAG = "ShiftCoachHCSleep"

    suspend fun readSleepSessions(
        client: HealthConnectClient,
        sleepFrom: Instant,
        now: Instant,
        logPrefix: String,
    ): Pair<JSONArray, Long> {
        val sleepArr = JSONArray()
        var sleepTotalMinutes = 0L
        val req =
            ReadRecordsRequest(
                SleepSessionRecord::class,
                TimeRangeFilter.between(sleepFrom, now),
            )
        val resp = client.readRecords(req)
        Log.i(TAG, "$logPrefix sleep permission path=read sleepRecordsCount=${resp.records.size}")
        for (session in resp.records) {
            try {
                val o = sessionToJsonObject(session) ?: continue
                val dm = o.optLong("duration_minutes", 0L)
                sleepTotalMinutes += dm
                sleepArr.put(o)
            } catch (e: Throwable) {
                Log.w(TAG, "$logPrefix skip one sleep session (non-fatal)", e)
            }
        }
        return Pair(sleepArr, sleepTotalMinutes)
    }

    /**
     * Returns null if the session cannot be serialized (invalid times, etc.).
     */
    fun sessionToJsonObject(session: SleepSessionRecord): JSONObject? {
        return try {
            val start = session.startTime
            val end = session.endTime
            val mins = ChronoUnit.MINUTES.between(start, end)
            if (mins < 0 || !start.isBefore(end)) {
                Log.w(TAG, "skip sleep session: invalid range start=$start end=$end")
                return null
            }
            val o = JSONObject()
            o.put("start", start.toString())
            o.put("end", end.toString())
            o.put("duration_minutes", mins.coerceAtLeast(0))

            try {
                session.metadata.id?.let { id ->
                    val sid = id.toString()
                    if (sid.isNotBlank()) {
                        o.put("sampleId", sid)
                        o.put("external_id", sid)
                    }
                }
            } catch (e: Throwable) {
                Log.w(TAG, "sleep session metadata.id unavailable", e)
            }

            val originPkg =
                try {
                    // 1.1.0: Metadata.dataOrigin may be absent on some OEM builds — never throw.
                    session.metadata.dataOrigin?.packageName?.trim()?.takeIf { it.isNotEmpty() }
                } catch (e: Throwable) {
                    Log.w(TAG, "sleep session dataOrigin/packageName unavailable", e)
                    null
                }
            if (originPkg != null) {
                o.put("source", originPkg)
            }

            val stagesArr = JSONArray()
            val segments =
                try {
                    session.stages
                } catch (e: Throwable) {
                    Log.w(TAG, "sleep session.stages unavailable — using empty stages[]", e)
                    emptyList()
                }
            for (seg in segments) {
                try {
                    val segObj = JSONObject()
                    segObj.put("start", seg.startTime.toString())
                    segObj.put("end", seg.endTime.toString())
                    segObj.put("stage", seg.stage)
                    stagesArr.put(segObj)
                } catch (e: Throwable) {
                    Log.w(TAG, "skip one sleep stage segment", e)
                }
            }
            o.put("stages", stagesArr)

            Log.i(
                TAG,
                "sleep record start=$start end=$end durationMin=$mins stages=${stagesArr.length()} source=${o.optString("source", "")}",
            )
            o
        } catch (e: Throwable) {
            Log.w(TAG, "sessionToJsonObject failed (non-fatal)", e)
            null
        }
    }
}
