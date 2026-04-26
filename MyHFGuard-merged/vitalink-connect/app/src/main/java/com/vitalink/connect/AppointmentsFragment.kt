package com.vitalink.connect

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.Request
import org.json.JSONArray
import java.util.Locale

class AppointmentsFragment : Fragment() {

    data class Appointment(val id: String, val title: String, val date: String, val location: String)

    private fun getMainActivity() = activity as? MainActivity

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_appointments, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        view.findViewById<ImageButton>(R.id.btnOpenSchedule)?.setOnClickListener {
            val patientId = currentPatientId()
            val main = getMainActivity()
            if (main != null) {
                val webBase = getString(R.string.web_app_url).removeSuffix("/")
                val url = "$webBase/schedule?patientId=$patientId"
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                } catch (_: Exception) {}
            }
        }
        fetchAppointments()
    }

    override fun onResume() {
        super.onResume()
        fetchAppointments()
    }

    private fun currentPatientId(): String {
        val sp = requireContext().getSharedPreferences("vitalink", android.content.Context.MODE_PRIVATE)
        return sp.getString("patientId", null) ?: ""
    }

    private fun fetchAppointments() {
        val main = getMainActivity() ?: return
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val patientId = currentPatientId()
                if (patientId.isEmpty()) return@launch

                val sp = requireContext().getSharedPreferences("vitalink", android.content.Context.MODE_PRIVATE)
                val token = sp.getString("supabaseAccessToken", "") ?: ""

                val url = "${main.baseUrl}/appointments?patientId=$patientId"
                val reqBuilder = Request.Builder().url(url).get()
                if (token.isNotEmpty()) {
                    reqBuilder.header("Authorization", "Bearer $token")
                }
                val req = reqBuilder.build()
                
                val resp = main.http.newCall(req).execute()
                if (resp.isSuccessful) {
                    val body = resp.body?.string() ?: "[]"
                    val json = JSONArray(body)
                    val list = mutableListOf<Appointment>()
                    for (i in 0 until json.length()) {
                        val obj = json.getJSONObject(i)
                        list.add(
                            Appointment(
                                obj.optString("id"),
                                obj.optString("title"),
                                obj.optString("date"),
                                obj.optString("location")
                            )
                        )
                    }
                    withContext(Dispatchers.Main) {
                        renderAppointments(list)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                withContext(Dispatchers.Main) {
                     android.widget.Toast.makeText(context, "Error fetching appointments: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun renderAppointments(list: List<Appointment>) {
        val container = view?.findViewById<LinearLayout>(R.id.llAppointments) ?: return
        container.removeAllViews()

        val upcoming = list.filter {
            val now = System.currentTimeMillis()
            try {
                if (android.os.Build.VERSION.SDK_INT >= 26) {
                    try {
                        java.time.OffsetDateTime.parse(it.date).toInstant().toEpochMilli() > now
                    } catch (_: Exception) {
                        java.time.Instant.parse(it.date).toEpochMilli() > now
                    }
                } else {
                    val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                    val date = sdf.parse(it.date)
                    date != null && date.time > now
                }
            } catch (_: Exception) { true } // If parse fails, show it anyway
        }

        if (upcoming.isEmpty()) {
            val tv = TextView(requireContext())
            tv.text = "No upcoming appointments"
            tv.setTextColor(resources.getColor(R.color.foreground, null))
            container.addView(tv)
            return
        }

        val inflater = LayoutInflater.from(requireContext())
        for (appt in upcoming) {
            val view = inflater.inflate(R.layout.item_appointment, container, false)
            view.findViewById<TextView>(R.id.txtTitle).text = "${appt.title} at ${appt.location}"

            try {
                val txt = if (android.os.Build.VERSION.SDK_INT >= 26) {
                     val fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM hh:mm a")
                     val z = java.time.ZoneId.systemDefault()
                     try {
                        val odt = java.time.OffsetDateTime.parse(appt.date, java.time.format.DateTimeFormatter.ISO_DATE_TIME)
                        odt.atZoneSameInstant(z).format(fmt)
                    } catch (_: Exception) {
                        try {
                            val inst = java.time.Instant.parse(appt.date)
                            java.time.ZonedDateTime.ofInstant(inst, z).format(fmt)
                        } catch (_: Exception) {
                            val ldt = java.time.LocalDateTime.parse(appt.date, java.time.format.DateTimeFormatter.ISO_DATE_TIME)
                            ldt.atZone(z).format(fmt)
                        }
                    }
                } else {
                    val inputFmt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                    val outputFmt = java.text.SimpleDateFormat("dd/MM hh:mm a", Locale.getDefault())
                    val d = inputFmt.parse(appt.date)
                    if (d != null) outputFmt.format(d) else appt.date
                }
                view.findViewById<TextView>(R.id.txtDate).text = txt
            } catch (_: Exception) {
                view.findViewById<TextView>(R.id.txtDate).text = appt.date
            }

            // Click to redirect to web
            view.setOnClickListener {
                val patientId = currentPatientId()
                val main = getMainActivity()
                if (main != null) {
                    // Use web_app_url from strings.xml
                    val webBase = getString(R.string.web_app_url).removeSuffix("/")
                    val url = "$webBase/schedule?patientId=$patientId"
                    
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }



            container.addView(view)
        }
    }


}
