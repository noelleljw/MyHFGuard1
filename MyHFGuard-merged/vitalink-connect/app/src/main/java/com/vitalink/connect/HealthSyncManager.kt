package com.vitalink.connect

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth

object HealthSyncManager {
    suspend fun syncData(context: Context) {
        try {
            val client = HealthConnectClient.getOrCreate(context)
            val nowInstant = Instant.now()
            val sevenDaysAgo = nowInstant.minusSeconds(7 * 24 * 60 * 60)
            val steps7d = readAll(client, StepsRecord::class, sevenDaysAgo, nowInstant)
            val dist7d = readAll(client, DistanceRecord::class, sevenDaysAgo, nowInstant)
            val hr7d = readAll(client, HeartRateRecord::class, sevenDaysAgo, nowInstant)
            val spo27d = readAll(client, OxygenSaturationRecord::class, sevenDaysAgo, nowInstant)

            val zone = ZoneId.systemDefault()
            val today = java.time.LocalDate.now(zone)
            val stepsToday = steps7d.filter { java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate() == today }
            val distToday = dist7d.filter { java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate() == today }
            val hrSamplesToday = hr7d.flatMap { it.samples }.filter { java.time.LocalDateTime.ofInstant(it.time, zone).toLocalDate() == today }
            val spo2Today = spo27d.filter { java.time.LocalDateTime.ofInstant(it.time, zone).toLocalDate() == today }

            val hrRecordsToday = hr7d.filter { 
                java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate() == today 
            }
            val spo2RecordsToday = spo27d.filter { 
                java.time.LocalDateTime.ofInstant(it.time, zone).toLocalDate() == today 
            }

            val steps = stepsToday.sumOf { it.count }
            val dist = distToday.sumOf { it.distance.inMeters }.toLong()
            val avgHr = if (hrSamplesToday.isNotEmpty()) hrSamplesToday.map { it.beatsPerMinute }.average().toLong() else 0L
            val avgSpo2 = if (spo2Today.isNotEmpty()) spo2Today.map { it.percentage.value }.average().toInt() else 0

            upload(context, steps, dist, avgHr, avgSpo2, stepsToday, distToday, hrRecordsToday, spo2RecordsToday)
        } catch (_: Exception) {}
    }

    private suspend fun <T : androidx.health.connect.client.records.Record> readAll(
        client: HealthConnectClient,
        clazz: kotlin.reflect.KClass<T>,
        start: Instant,
        end: Instant
    ): List<T> {
        val out = mutableListOf<T>()
        var token: String? = null
        do {
            val resp = client.readRecords(
                ReadRecordsRequest(
                    clazz,
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                    pageToken = token
                )
            )
            out.addAll(resp.records)
            token = resp.pageToken
        } while (token != null)
        return out
    }

    private suspend fun upload(
        context: Context,
        steps: Long,
        dist: Long,
        avgHr: Long,
        avgSpo2: Int,
        stepRecords: List<StepsRecord>,
        distRecords: List<DistanceRecord>,
        hrRecords: List<HeartRateRecord>,
        spo2Records: List<OxygenSaturationRecord>
    ) {
        val sp = context.getSharedPreferences("vitalink", Context.MODE_PRIVATE)
        val patientId = sp.getString("patientId", null) ?: return
        var token = sp.getString("supabaseAccessToken", "") ?: ""
        val baseUrl = context.getString(R.string.api_base_url)
        val zone = ZoneId.systemDefault()
        val today = java.time.LocalDate.now(zone)

        // Identify all unique dates in the records to batch uploads by day
        val allDates = mutableSetOf<java.time.LocalDate>()
        stepRecords.forEach { allDates.add(java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate()) }
        distRecords.forEach { allDates.add(java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate()) }
        hrRecords.forEach { allDates.add(java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate()) }
        spo2Records.forEach { allDates.add(java.time.LocalDateTime.ofInstant(it.time, zone).toLocalDate()) }
        allDates.add(today) // Ensure today is always processed

        // Sort dates to upload chronologically
        val sortedDates = allDates.sorted()
        
        val client = OkHttpClient()

        for (date in sortedDates) {
            val isToday = (date == today)
            
            val sRecs = stepRecords.filter { java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate() == date }
            val dRecs = distRecords.filter { java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate() == date }
            val hRecs = hrRecords.filter { java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate() == date }
            val oRecs = spo2Records.filter { java.time.LocalDateTime.ofInstant(it.time, zone).toLocalDate() == date }

            if (!isToday && sRecs.isEmpty() && dRecs.isEmpty() && hRecs.isEmpty() && oRecs.isEmpty()) continue

            try {
                val json = JSONObject().apply {
                    put("patient_id", patientId)
                    put("steps", if (isToday) steps else 0)
                    put("distance", if (isToday) dist else 0)
                    put("avg_hr", if (isToday) avgHr else 0)
                    put("avg_spo2", if (isToday) avgSpo2 else 0)
                    put("date", date.toString())

                    val stepsArray = JSONArray()
                    sRecs.forEach {
                        val o = JSONObject()
                        o.put("startTime", it.startTime.toString())
                        o.put("endTime", it.endTime.toString())
                        o.put("count", it.count)
                        stepsArray.put(o)
                    }
                    put("steps_samples", stepsArray)

                    val distArray = JSONArray()
                    dRecs.forEach {
                        val o = JSONObject()
                        o.put("startTime", it.startTime.toString())
                        o.put("endTime", it.endTime.toString())
                        o.put("distanceMeters", it.distance.inMeters)
                        distArray.put(o)
                    }
                    put("distance_samples", distArray)

                    val hrArray = JSONArray()
                    hRecs.forEach { r ->
                        r.samples.forEach { s ->
                            val o = JSONObject()
                            o.put("time", s.time.toString())
                            o.put("bpm", s.beatsPerMinute)
                            hrArray.put(o)
                        }
                    }
                    put("hr_samples", hrArray)

                    val spo2Array = JSONArray()
                    oRecs.forEach { r ->
                        val o = JSONObject()
                        o.put("time", r.time.toString())
                        o.put("percentage", r.percentage.value)
                        spo2Array.put(o)
                    }
                    put("spo2_samples", spo2Array)
                }
                
                val url = "$baseUrl/patient/sync-metrics"
                val body = json.toString().toRequestBody("application/json".toMediaType())
                
                fun buildRequest(currentToken: String): Request {
                    val builder = Request.Builder().url(url).post(body)
                    if (currentToken.isNotEmpty()) {
                        builder.header("Authorization", "Bearer $currentToken")
                    }
                    return builder.build()
                }

                var response = client.newCall(buildRequest(token)).execute()
                if (response.code == 401) {
                    response.close()
                    // Try to refresh token
                    val newToken = refreshToken(context)
                    if (newToken != null) {
                        token = newToken
                        response = client.newCall(buildRequest(token)).execute()
                    }
                }
                response.close()
            } catch (_: Exception) {}
        }
    }

    private suspend fun refreshToken(context: Context): String? {
        val sp = context.getSharedPreferences("vitalink", Context.MODE_PRIVATE)
        val refreshToken = sp.getString("supabaseRefreshToken", "") ?: return null
        if (refreshToken.isEmpty()) return null

        return try {
            val supabaseUrl = context.getString(R.string.supabase_url)
            val supabaseKey = context.getString(R.string.supabase_anon_key)
            val supabase = createSupabaseClient(supabaseUrl, supabaseKey) {
                install(Auth)
            }
            // Try to retrieve session using refresh token
            supabase.auth.refreshSession(refreshToken)
            val session = supabase.auth.currentSessionOrNull()
            if (session != null) {
                sp.edit()
                   .putString("supabaseAccessToken", session.accessToken)
                   .putString("supabaseRefreshToken", session.refreshToken)
                   .apply()
                session.accessToken
            } else null
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
