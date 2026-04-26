package com.vitalink.connect

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import android.provider.Settings
import android.net.Uri
import android.content.SharedPreferences
import android.widget.TextView
import android.app.TimePickerDialog
import java.time.ZoneId
import java.time.ZonedDateTime

class SettingsActivity : BaseActivity() {
    private lateinit var sp: SharedPreferences
    private lateinit var txtMorning: TextView
    private lateinit var txtAfternoon: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            setContentView(R.layout.activity_settings)

            sp = getSharedPreferences("vitalink_daily_checks", MODE_PRIVATE)
            txtMorning = findViewById(R.id.txtMorningTime)
            txtAfternoon = findViewById(R.id.txtAfternoonTime)

            updateTimeDisplays()

            findViewById<android.view.View>(R.id.btnMorningReminder).setOnClickListener {
                showTimePicker("reminder_time_morning", "reminder_minute_morning", 9)
            }
            findViewById<android.view.View>(R.id.btnAfternoonReminder).setOnClickListener {
                showTimePicker("reminder_time_afternoon", "reminder_minute_afternoon", 15)
            }

            findViewById<android.view.View>(R.id.btnBack)?.setOnClickListener {
                finish()
            }

            findViewById<android.view.View>(R.id.btnNotificationPermission)?.setOnClickListener {
                try {
                    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    intent.putExtra("android.provider.extra.APP_PACKAGE", packageName)
                    intent.putExtra("app_package", packageName)
                    intent.putExtra("app_uid", applicationInfo.uid)
                    startActivity(intent)
                } catch (_: Exception) {
                    try {
                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                        intent.data = Uri.parse("package:$packageName")
                        startActivity(intent)
                    } catch (_: Exception) {}
                }
            }

            findViewById<android.view.View>(R.id.btnExactAlarmPermission)?.setOnClickListener {
                try {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                        startActivity(intent)
                    } else {
                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                        intent.data = Uri.parse("package:$packageName")
                        startActivity(intent)
                    }
                } catch (_: Exception) {}
            }

            findViewById<android.view.View>(R.id.btnBatteryOptimization)?.setOnClickListener {
                try {
                    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    startActivity(intent)
                } catch (_: Exception) {
                    try {
                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                        intent.data = Uri.parse("package:$packageName")
                        startActivity(intent)
                    } catch (_: Exception) {}
                }
            }

            findViewById<android.view.View>(R.id.btnLogout)?.setOnClickListener {
                val sp = getSharedPreferences("vitalink", MODE_PRIVATE)
                sp.edit().clear().apply()
                
                Toast.makeText(this, "Logged out", Toast.LENGTH_SHORT).show()
                
                val intent = Intent(this, OnboardingActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            }

            findViewById<android.view.View>(R.id.btnAppSystemSettings)?.setOnClickListener {
                try {
                    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    intent.data = Uri.parse("package:$packageName")
                    startActivity(intent)
                } catch (_: Exception) {}
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Error opening settings: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    private fun updateTimeDisplays() {
        val mHour = sp.getInt("reminder_time_morning", 9)
        val mMin = sp.getInt("reminder_minute_morning", 0)
        val aHour = sp.getInt("reminder_time_afternoon", 15)
        val aMin = sp.getInt("reminder_minute_afternoon", 0)

        txtMorning.text = formatTime(mHour, mMin)
        txtAfternoon.text = formatTime(aHour, aMin)
    }

    private fun formatTime(hour: Int, minute: Int): String {
        val h = if (hour == 0 || hour == 12) 12 else hour % 12
        val ampm = if (hour < 12) "AM" else "PM"
        return String.format("%02d:%02d %s", h, minute, ampm)
    }

    private fun showTimePicker(keyHour: String, keyMinute: String, defaultHour: Int) {
        val currentHour = sp.getInt(keyHour, defaultHour)
        val currentMinute = sp.getInt(keyMinute, 0)
        TimePickerDialog(this, { _, hourOfDay, minute ->
            sp.edit().putInt(keyHour, hourOfDay).putInt(keyMinute, minute).apply()
            
            // Reset the notification flag for today so it can fire again if time is changed
            resetDailyNotificationFlag(keyHour)
            
            updateTimeDisplays()
            ReminderScheduler.scheduleDailyReminders(this)
            Toast.makeText(this, "Reminder time updated", Toast.LENGTH_SHORT).show()
        }, currentHour, currentMinute, false).show()
    }

    private fun resetDailyNotificationFlag(keyHour: String) {
        try {
            val type = when (keyHour) {
                "reminder_time_morning" -> "morning"
                "reminder_time_afternoon" -> "afternoon"
                else -> return
            }
            val now = ZonedDateTime.now(ZoneId.of("Asia/Kuala_Lumpur"))
            val todayStr = now.toLocalDate().toString()
            val key = "notified_${type}_$todayStr"
            sp.edit().remove(key).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
