package com.vitalink.connect

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import java.util.Locale
import java.util.Calendar
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

object ReminderScheduler {
    fun startSchedule(context: Context) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, SyncReceiver::class.java)
        val pi = PendingIntent.getBroadcast(context, 777, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        try { am.cancel(pi) } catch (_: Exception) {}
        val interval = AlarmManager.INTERVAL_HOUR // 1 hour for production
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + interval, interval, pi)
        
        // Also schedule specific daily reminders
        scheduleDailyReminders(context)
    }

    fun scheduleDailyReminders(context: Context) {
        val sp = context.getSharedPreferences("vitalink_daily_checks", Context.MODE_PRIVATE)
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, SyncReceiver::class.java)

        val reminders = listOf(
            Triple(1001, "reminder_time_morning", "reminder_minute_morning"),
            Triple(1002, "reminder_time_afternoon", "reminder_minute_afternoon")
        )

        val defaults = mapOf(
            "reminder_time_morning" to 9,
            "reminder_time_afternoon" to 15
        )

        for ((reqCode, keyHour, keyMin) in reminders) {
            val hour = sp.getInt(keyHour, defaults[keyHour] ?: 9)
            val minute = sp.getInt(keyMin, 0)

            val calendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                if (before(Calendar.getInstance())) {
                    add(Calendar.DATE, 1)
                }
            }

            val pi = PendingIntent.getBroadcast(context, reqCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            try { am.cancel(pi) } catch (_: Exception) {}
            am.setRepeating(AlarmManager.RTC_WAKEUP, calendar.timeInMillis, AlarmManager.INTERVAL_DAY, pi)
        }
    }

    fun refresh(context: Context, http: OkHttpClient, baseUrl: String, patientId: String) {
        val url = baseUrl + "/patient/reminders?patientId=" + java.net.URLEncoder.encode(patientId, "UTF-8")
        
        val spToken = context.getSharedPreferences("vitalink", Context.MODE_PRIVATE)
        val token = spToken.getString("supabaseAccessToken", "") ?: ""

        // Check time for Daily Notifications (9am, 3pm, 9pm MYT)
        checkDailyNotifications(context, http, baseUrl, patientId, token)

        val sp = context.getSharedPreferences("vitalink_reminders", Context.MODE_PRIVATE)
        val seenIds = sp.getStringSet("seen_ids", emptySet())?.toMutableSet() ?: mutableSetOf()
        var idsChanged = false

        try {
            val reqBuilder = Request.Builder().url(url).get()
            if (token.isNotEmpty()) {
                reqBuilder.header("Authorization", "Bearer $token")
            }
            val req = reqBuilder.build()
            val resp = http.newCall(req).execute()
            resp.use {
                if (it.code != 200) return
                val body = it.body?.string() ?: return
                val obj = JSONObject(body)
                val arr = obj.optJSONArray("reminders") ?: return
                for (i in 0 until arr.length()) {
                    val r = arr.getJSONObject(i)
                    val id = r.optString("id")
                    val title = r.optString("title")
                    val dateStr = r.optString("date")
                    val t: Long? = try {
                        if (android.os.Build.VERSION.SDK_INT >= 26) {
                            try {
                                java.time.OffsetDateTime.parse(dateStr).toInstant().toEpochMilli()
                            } catch (_: Exception) {
                                java.time.Instant.parse(dateStr).toEpochMilli()
                            }
                        } else {
                            // Fallback for older devices (basic ISO8601)
                            try {
                                val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                                sdf.parse(dateStr)?.time
                            } catch (_: Exception) { null }
                        }
                    } catch (_: Exception) { null }
                    if (t != null) {
                        // Check if the appointment is in the future
                        val nowMs = System.currentTimeMillis()
                        val isFuture = t > nowMs
                        
                        // If it's a new ID we haven't seen before, AND it is in the future, notify user
                        if (!seenIds.contains(id) && isFuture) {
                            val date = java.util.Date(t)
                            val fmt = java.text.SimpleDateFormat("dd/MM h:mma", Locale.getDefault())
                            val dStr = fmt.format(date)
                            val intent = Intent(context, ReminderReceiver::class.java)
                            intent.putExtra("title", "New Appointment")
                            intent.putExtra("body", "$title on $dStr")
                            context.sendBroadcast(intent)
                            seenIds.add(id)
                            idsChanged = true
                        }
                        
                        // Always try to schedule (scheduleFor handles future checks for reminders)
                        // If the date changed to future, scheduleFor will set the alarms correctly.
                        scheduleFor(context, id, title, t)
                    }
                }
            }
        } catch (_: Exception) {}
        
        if (idsChanged) {
            sp.edit().putStringSet("seen_ids", seenIds).apply()
        }

        try {
            val reqBuilder = Request.Builder().url(baseUrl + "/patient/medications?patientId=" + java.net.URLEncoder.encode(patientId, "UTF-8")).get()
            if (token.isNotEmpty()) {
                reqBuilder.header("Authorization", "Bearer $token")
            }
            val req = reqBuilder.build()
            val resp = http.newCall(req).execute()
            resp.use {
                if (it.code == 200) {
                    val body = it.body?.string() ?: "{}"
                    val obj = JSONObject(body)
                    val prefs = obj.optJSONObject("preferences") ?: JSONObject()
                    val hour = prefs.optInt("notify_hour", 12)
                    
                    // Cancel old individual alarms
                    cancelDaily(context, 11001)
                    cancelDaily(context, 11002)
                    cancelDaily(context, 11003)
                    cancelDaily(context, 11004)

                    val noonMeds = mutableListOf<String>()
                    if (prefs.optBoolean("beta_blockers", false)) noonMeds.add("Beta blockers")
                    if (prefs.optBoolean("raas_inhibitors", false)) noonMeds.add("RAAS inhibitors")
                    if (prefs.optBoolean("mras", false)) noonMeds.add("MRAs")
                    if (prefs.optBoolean("sglt2_inhibitors", false)) noonMeds.add("SGLT2 inhibitors")

                    if (noonMeds.isNotEmpty()) {
                        val title = "Time for medications: " + noonMeds.joinToString(", ")
                        scheduleDaily(context, 11000, title, 12) // Fixed at 12:00 PM
                    } else {
                        cancelDaily(context, 11000)
                    }

                    if (prefs.optBoolean("statin", false)) {
                        scheduleDaily(context, 11005, "Time for Statin medication", 22) // Fixed at 10:00 PM
                    } else {
                        cancelDaily(context, 11005)
                    }
                }
            }
        } catch (_: Exception) {}
    }

    fun sendTestNotifications(context: Context, patientId: String) {
        val base = context.getString(R.string.web_app_url).removeSuffix("/")
        val selfCheckUrl = "$base/self-check?patientId=" + java.net.URLEncoder.encode(patientId, "UTF-8")
        val bpUrl = "$base/vitals?patientId=" + java.net.URLEncoder.encode(patientId, "UTF-8")
        runCatching {
            val i1 = Intent(context, ReminderReceiver::class.java)
            i1.putExtra("title", "Daily Self Check")
            i1.putExtra("body", "Log your weight and symptoms today.")
            i1.putExtra("url", selfCheckUrl)
            context.sendBroadcast(i1)
        }
        runCatching {
            val i2 = Intent(context, ReminderReceiver::class.java)
            i2.putExtra("title", "Blood Pressure")
            i2.putExtra("body", "Please record today's BP reading.")
            i2.putExtra("url", bpUrl)
            context.sendBroadcast(i2)
        }
    }

    private fun checkDailyNotifications(context: Context, http: OkHttpClient, baseUrl: String, patientId: String, token: String) {
        val sp = context.getSharedPreferences("vitalink_daily_checks", Context.MODE_PRIVATE)
        
        // Use Calendar for compatibility
        val cal = Calendar.getInstance(java.util.TimeZone.getTimeZone("Asia/Kuala_Lumpur"))
        val currentHour = cal.get(Calendar.HOUR_OF_DAY)
        val currentMinute = cal.get(Calendar.MINUTE)
        val year = cal.get(Calendar.YEAR)
        val month = cal.get(Calendar.MONTH) + 1
        val day = cal.get(Calendar.DAY_OF_MONTH)
        val todayStr = String.format(Locale.US, "%04d-%02d-%02d", year, month, day)

        fun isTimePassed(targetHour: Int, targetMinute: Int): Boolean {
            if (currentHour > targetHour) return true
            if (currentHour == targetHour && currentMinute >= targetMinute) return true
            return false
        }

        val morningHour = sp.getInt("reminder_time_morning", 9)
        val morningMinute = sp.getInt("reminder_minute_morning", 0)
        if (isTimePassed(morningHour, morningMinute) && !sp.getBoolean("notified_morning_$todayStr", false)) {
            notifyOpenWeb(context, "Daily Health Log", "Please log your weight, BP, and symptoms today.", patientId, todayStr, 1001)
            sp.edit().putBoolean("notified_morning_$todayStr", true).apply()
        }

        val afternoonHour = sp.getInt("reminder_time_afternoon", 15)
        val afternoonMinute = sp.getInt("reminder_minute_afternoon", 0)
        if (isTimePassed(afternoonHour, afternoonMinute) && !sp.getBoolean("notified_afternoon_$todayStr", false)) {
            val status = getDailyStatus(http, baseUrl, patientId, token, todayStr)
            val baseWeb = context.getString(R.string.web_app_url).removeSuffix("/")
            if (!status.hasWeight) {
                val url = "$baseWeb/self-check?patientId=" + java.net.URLEncoder.encode(patientId, "UTF-8")
                notifyLink(context, "Log Weight", "Please log your weight today.", url, 10021)
            }
            if (!status.hasBp) {
                val url = "$baseWeb/vitals?patientId=" + java.net.URLEncoder.encode(patientId, "UTF-8")
                notifyLink(context, "Record Blood Pressure", "Please record today's BP reading.", url, 10022)
            }
            if (!status.hasSymptoms) {
                val url = "$baseWeb/self-check?patientId=" + java.net.URLEncoder.encode(patientId, "UTF-8") + "&tab=symptoms"
                notifyLink(context, "Log Symptoms", "Please log today's symptoms.", url, 10023)
            }
            sp.edit().putBoolean("notified_afternoon_$todayStr", true).apply()
        }
    }

    private fun checkDailyDataLogged(http: OkHttpClient, baseUrl: String, patientId: String, token: String, dateStr: String): Boolean {
        try {
            val url = "$baseUrl/patient/daily-status?patientId=$patientId&date=$dateStr"
            val req = Request.Builder().url(url).header("Authorization", "Bearer $token").get().build()
            http.newCall(req).execute().use { resp ->
                if (resp.code == 200) {
                    val json = JSONObject(resp.body?.string() ?: "{}")
                    return json.optBoolean("has_weight") && json.optBoolean("has_bp") && json.optBoolean("has_symptoms")
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return false
    }

    private data class DailyStatus(val hasWeight: Boolean, val hasBp: Boolean, val hasSymptoms: Boolean)
    private fun getDailyStatus(http: OkHttpClient, baseUrl: String, patientId: String, token: String, dateStr: String): DailyStatus {
        try {
            val url = "$baseUrl/patient/daily-status?patientId=$patientId&date=$dateStr"
            val req = Request.Builder().url(url).header("Authorization", "Bearer $token").get().build()
            http.newCall(req).execute().use { resp ->
                if (resp.code == 200) {
                    val json = JSONObject(resp.body?.string() ?: "{}")
                    return DailyStatus(
                        json.optBoolean("has_weight"),
                        json.optBoolean("has_bp"),
                        json.optBoolean("has_symptoms"),
                    )
                }
            }
        } catch (_: Exception) { }
        return DailyStatus(false, false, false)
    }

    private fun notifyOpenWeb(context: Context, title: String, body: String, patientId: String, dateStr: String, requestCode: Int) {
        val base = context.getString(R.string.web_app_url)
        val url = "$base/dashboard?patientId=" + java.net.URLEncoder.encode(patientId, "UTF-8") + "&date=" + java.net.URLEncoder.encode(dateStr, "UTF-8")
        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url))
        val pi = PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        val channelId = "vitalink_reminders_v2"
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            if (nm.getNotificationChannel(channelId) == null) {
                val ch = android.app.NotificationChannel(channelId, "Vitalink Reminders", android.app.NotificationManager.IMPORTANCE_HIGH)
                nm.createNotificationChannel(ch)
            }
        }
        val n = androidx.core.app.NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()
        nm.notify(requestCode, n)
    }

    private fun notifyLink(context: Context, title: String, body: String, url: String, requestCode: Int) {
        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url))
        val pi = PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        val channelId = "vitalink_reminders_v2"
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            if (nm.getNotificationChannel(channelId) == null) {
                val ch = android.app.NotificationChannel(channelId, "Vitalink Reminders", android.app.NotificationManager.IMPORTANCE_HIGH)
                nm.createNotificationChannel(ch)
            }
        }
        val n = androidx.core.app.NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()
        nm.notify(requestCode, n)
    }

    private fun scheduleFor(context: Context, id: String, title: String, eventMs: Long) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val now = System.currentTimeMillis()
        
        val date = java.util.Date(eventMs)
        val fmt = java.text.SimpleDateFormat("dd/MM h:mma", Locale.getDefault())
        val dStr = fmt.format(date)
        val body = "$title on $dStr"

        val pairs = listOf(
            24 * 60 * 60 * 1000L to "Appointment tomorrow",
            60 * 60 * 1000L to "Appointment in 1 hour",
            5 * 60 * 1000L to "Appointment in 5 minutes",
            0L to "Appointment now"
        )
        for ((offset, prefix) in pairs) {
            val fireAt = eventMs - offset
            if (fireAt > now) {
                val pi = pending(context, id + "|" + offset, prefix, body)
                try { am.cancel(pi) } catch (_: Exception) {}
                setExact(am, fireAt, pi)
            }
        }
    }

    private fun pending(context: Context, key: String, prefix: String, title: String): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java)
        intent.putExtra("title", prefix)
        intent.putExtra("body", title)
        val req = key.hashCode()
        return PendingIntent.getBroadcast(context, req, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun setExact(am: AlarmManager, whenMs: Long, pi: PendingIntent) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= 31) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, pi)
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, pi)
                }
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, pi)
            }
        } catch (e: Exception) {
            try {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, whenMs, pi)
            } catch (_: Exception) {}
        }
    }

    private fun cancelDaily(context: Context, requestCode: Int) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, ReminderReceiver::class.java)
        val pi = PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        try { am.cancel(pi) } catch (_: Exception) {}
        pi.cancel()
    }

    private fun scheduleDaily(context: Context, requestCode: Int, title: String, hour: Int) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, ReminderReceiver::class.java)
        intent.putExtra("title", title)
        val pi = PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        try { am.cancel(pi) } catch (_: Exception) {}
        val cal = java.util.Calendar.getInstance()
        cal.set(java.util.Calendar.HOUR_OF_DAY, hour)
        cal.set(java.util.Calendar.MINUTE, 0)
        cal.set(java.util.Calendar.SECOND, 0)
        if (cal.timeInMillis < System.currentTimeMillis()) cal.add(java.util.Calendar.DAY_OF_YEAR, 1)
        am.setRepeating(AlarmManager.RTC_WAKEUP, cal.timeInMillis, AlarmManager.INTERVAL_DAY, pi)
    }
}

