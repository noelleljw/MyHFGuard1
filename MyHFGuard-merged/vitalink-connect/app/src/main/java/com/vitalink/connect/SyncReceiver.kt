package com.vitalink.connect

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient

class SyncReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val sp = context.getSharedPreferences("vitalink", Context.MODE_PRIVATE)
        val patientId = sp.getString("patientId", null) ?: return
        val baseUrl = context.getString(R.string.api_base_url)
        
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val http = OkHttpClient()
                ReminderScheduler.refresh(context, http, baseUrl, patientId)
                val testPref = context.getSharedPreferences("vitalink_tests", Context.MODE_PRIVATE)
                
                var enabled = true
                if (android.os.Build.VERSION.SDK_INT >= 24) {
                    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
                    enabled = nm.areNotificationsEnabled()
                }

                val already = testPref.getBoolean("sent_once", false)
                if (!already && enabled) {
                    ReminderScheduler.sendTestNotifications(context, patientId)
                    testPref.edit().putBoolean("sent_once", true).apply()
                }
                // Trigger Background Sync of Vitals (Requires API 26+ for Health Connect and java.time)
                if (android.os.Build.VERSION.SDK_INT >= 26) {
                    try {
                        HealthSyncManager.syncData(context)
                    } catch (_: Exception) {}
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                pendingResult.finish()
            }
        }
    }
}
