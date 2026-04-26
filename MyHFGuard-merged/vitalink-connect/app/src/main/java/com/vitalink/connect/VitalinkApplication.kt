package com.vitalink.connect

import android.app.Application
import androidx.appcompat.app.AppCompatDelegate

class VitalinkApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        val sp = getSharedPreferences("vitalink_prefs", android.content.Context.MODE_PRIVATE)
        val isDark = sp.getBoolean("is_dark_mode", false)
        AppCompatDelegate.setDefaultNightMode(
            if (isDark) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
        )

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                "reminders",
                "Reminders",
                android.app.NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Patient reminders"
            }
            val nm = getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            nm.createNotificationChannel(channel)
        }
    }
}