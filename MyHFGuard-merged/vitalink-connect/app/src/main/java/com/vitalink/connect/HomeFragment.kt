package com.vitalink.connect

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TableLayout
import android.widget.TableRow
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.cardview.widget.CardView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.ViewModelProvider
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

class HomeFragment : Fragment() {

    private lateinit var client: HealthConnectClient
    private lateinit var viewModel: HomeViewModel
    
    private val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(OxygenSaturationRecord::class)
    )

    private val requestPermissions = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        lifecycleScope.launch {
            val view = view ?: return@launch
            val txt = view.findViewById<TextView?>(R.id.txtOutput)
            val missing = permissions.minus(granted)
            if (missing.isEmpty()) {
                txt?.text = "Permissions granted"
            } else {
                val names = missing.joinToString { it.toString().substringAfterLast(".") }
                txt?.text = "Missing: $names"
            }
            val ok = missing.isEmpty()
            if (ok) {
                val sp = requireContext().getSharedPreferences("vitalink", android.content.Context.MODE_PRIVATE)
                sp.edit().putBoolean("first_time_setup", false).apply()
            }
            applyPermissionsUI(ok)
        }
    }

    private suspend fun updateSyncStatus() {
        val main = getMainActivity() ?: return
        val pid = currentPatientId()
        if (pid.isEmpty()) return
        withContext(Dispatchers.IO) {
            try {
                val url = "${main.baseUrl}/patient/summary?patientId=" + java.net.URLEncoder.encode(pid, "UTF-8")
                val req = Request.Builder().url(url).get().build()
                val resp = main.http.newCall(req).execute()
                resp.use {
                    val body = it.body?.string() ?: "{}"
                    val obj = JSONObject(body)
                    val summary = obj.optJSONObject("summary") ?: JSONObject()
                    val last = summary.optString("lastSyncTs", "")
                    withContext(Dispatchers.Main) {
                        val view = view ?: return@withContext
                        val ring = view.findViewById<View>(R.id.syncRing)
                        val txt = view.findViewById<TextView>(R.id.txtSyncStatus)
                        if (last.isNotEmpty()) {
                            if (android.os.Build.VERSION.SDK_INT >= 26) {
                                val ts = try { java.time.Instant.parse(last) } catch (_: Exception) { null }
                                if (ts != null) {
                                    val mins = java.time.Duration.between(ts, java.time.Instant.now()).abs().toMinutes()
                                    txt?.text = "Last sync: ${if (mins < 60) "${mins}m ago" else "${mins/60}h ago"}"
                                    val color = if (mins <= 90) ContextCompat.getColor(main, R.color.btnSecondary) else ContextCompat.getColor(main, R.color.bannerRequiredAccent)
                                    ring?.background?.setTint(color)
                                } else {
                                    txt?.text = "Last sync: unknown"
                                    ring?.background?.setTint(ContextCompat.getColor(main, R.color.bannerRequiredAccent))
                                }
                            } else {
                                txt?.text = "Last sync: ${last.take(10)}"
                                ring?.background?.setTint(ContextCompat.getColor(main, R.color.btnSecondary))
                            }
                        } else {
                            txt?.text = "Last sync: none"
                            ring?.background?.setTint(ContextCompat.getColor(main, R.color.btnDanger))
                        }
                    }
                }
            } catch (_: Exception) {}
        }
    }
    private val requestNotificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _: Boolean -> }

    private fun getMainActivity() = activity as? MainActivity

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return try {
            inflater.inflate(R.layout.fragment_home, container, false)
        } catch (e: Exception) {
            android.util.Log.e("HomeFragment", "Inflate failed", e)
            val ctx = context ?: return null
            val v = android.widget.LinearLayout(ctx)
            v.orientation = android.widget.LinearLayout.VERTICAL
            v.setBackgroundColor(ContextCompat.getColor(ctx, R.color.background))
            val tv = android.widget.TextView(ctx)
            tv.text = "Home unavailable"
            tv.textSize = 16f
            tv.setTextColor(ContextCompat.getColor(ctx, R.color.foreground))
            tv.gravity = Gravity.CENTER
            tv.setPadding(32, 32, 32, 32)
            v.addView(tv)
            v
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        val context = requireContext()
        var status = 2 // SDK_UNAVAILABLE
        try {
             status = HealthConnectClient.getSdkStatus(context)
        } catch (_: Throwable) {
             // Health Connect likely not available or crash on older devices
        }

        val txtOutput = view.findViewById<TextView?>(R.id.txtOutput)
        val cardGrant = view.findViewById<CardView>(R.id.cardGrant)
        val cardRead = view.findViewById<CardView>(R.id.cardRead)
        val cardWebCharts = view.findViewById<CardView>(R.id.cardWebCharts)

        if (status != HealthConnectClient.SDK_AVAILABLE) {
            txtOutput?.text = "Health Connect not available"
            cardGrant?.isEnabled = false
            cardRead?.isEnabled = false
            return
        }

        try {
            client = HealthConnectClient.getOrCreate(context)
        } catch (e: Exception) {
            txtOutput?.text = "Error initializing Health Connect"
            return
        }

        val sp = context.getSharedPreferences("vitalink", android.content.Context.MODE_PRIVATE)
        val isFirstTime = sp.getBoolean("first_time_setup", true)
        val cardFirstTime = view.findViewById<CardView>(R.id.cardFirstTime)
        val btnSetupPermissions = view.findViewById<MaterialButton>(R.id.btnSetupPermissions)

        if (isFirstTime) {
            cardFirstTime?.visibility = View.VISIBLE
            btnSetupPermissions?.setOnClickListener {
                lifecycleScope.launch {
                    val granted = client.permissionController.getGrantedPermissions()
                    if (!granted.containsAll(permissions)) {
                        val missing = permissions.minus(granted)
                        val names = missing.joinToString { it.toString().substringAfterLast(".") }
                        android.widget.Toast.makeText(context, "Requesting: $names", android.widget.Toast.LENGTH_SHORT).show()
                        requestPermissions.launch(permissions)
                    }
                }
            }
        } else {
            cardFirstTime?.visibility = View.GONE
        }

        lifecycleScope.launch {
            val grantedInitial = client.permissionController.getGrantedPermissions()
            applyPermissionsUI(grantedInitial.containsAll(permissions))
        }

        renderPersistedSummary()
        
        cardGrant?.setOnClickListener {
            lifecycleScope.launch {
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.containsAll(permissions)) {
                    try {
                         val intent = Intent("androidx.health.connect.client.action.HEALTH_CONNECT_SETTINGS")
                         startActivity(intent)
                     } catch (e: Exception) {
                         try {
                             val intent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                             intent.data = Uri.fromParts("package", requireContext().packageName, null)
                             startActivity(intent)
                         } catch (e2: Exception) {
                             android.widget.Toast.makeText(requireContext(), "Cannot open settings", android.widget.Toast.LENGTH_SHORT).show()
                         }
                     }
                } else {
                    applyPermissionsUI(true)
                }
            }
        }

        cardRead?.setOnClickListener {
            lifecycleScope.launch {
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.containsAll(permissions)) {
                    val missing = permissions.minus(granted)
                    val missingNames = missing.joinToString { p -> 
                        p.toString().substringAfterLast(".") 
                    }
                    android.widget.Toast.makeText(context, "Missing: $missingNames", android.widget.Toast.LENGTH_LONG).show()
                    requestPermissions.launch(permissions)
                    return@launch
                }
                ensurePatientExists()
                readMetricsAndShow()
                refreshReminderNotifications()
                lifecycleScope.launch { updateSyncStatus() }
                
                if (Build.VERSION.SDK_INT >= 33) {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                    }
                }
            }
        }

        cardWebCharts?.setOnClickListener {
            val main = getMainActivity()
            if (main != null) {
                try {
                    val patientId = currentPatientId()
                    val baseUrl = getString(R.string.web_app_url)
                    val url = if (baseUrl.endsWith("#")) {
                        "$baseUrl/dashboard?patientId=$patientId"
                    } else {
                        "$baseUrl/#/dashboard?patientId=$patientId"
                    }
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                } catch (e: Exception) {
                    android.widget.Toast.makeText(requireContext(), "Error opening link", android.widget.Toast.LENGTH_SHORT).show()
                }
            }
        }

        viewModel = ViewModelProvider(this)[HomeViewModel::class.java]
        
        // Check for End of Day Chart intent
        if (requireActivity().intent?.getBooleanExtra("openEndOfDayChart", false) == true) {
            // Show Chart Logic (For now, just ensure table/chart is visible)
            // Ideally switch to a Chart Tab or expand a section
        }

        if (viewModel.dailySteps != null) {
            try {
                renderCards()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        lifecycleScope.launch {
            updateSyncStatus()
        }
    }

    private fun applyPermissionsUI(granted: Boolean) {
        val view = view ?: return
        val bannerBox = view.findViewById<CardView>(R.id.bannerBox)
        val cardFirstTime = view.findViewById<CardView>(R.id.cardFirstTime)
        
        if (granted) {
            bannerBox?.visibility = View.GONE
            cardFirstTime?.visibility = View.GONE
        } else {
            val sp = requireContext().getSharedPreferences("vitalink", android.content.Context.MODE_PRIVATE)
            if (!sp.getBoolean("first_time_setup", true)) {
                 bannerBox?.visibility = View.VISIBLE
            }
        }
    }

    private suspend fun ensurePatientExists() {
        val main = getMainActivity() ?: return
        val pid = currentPatientId()
        if (pid.isEmpty()) return
        
        withContext(Dispatchers.IO) {
            try {
                val sp = requireContext().getSharedPreferences("vitalink", android.content.Context.MODE_PRIVATE)
                val email = sp.getString("userEmail", null)
                val dateOfBirth = sp.getString("dateOfBirth", null) ?: "1970-01-01"
                val namePart = (email ?: "").substringBefore("@")
                val firstName = namePart.replace(Regex("[^A-Za-z]"), "").ifEmpty { "User" }
                val lastName = "Patient"
                
                val jsonDob = JSONObject().apply {
                    put("patient_id", pid)
                    put("owner_id", pid)
                    put("first_name", firstName)
                    put("last_name", lastName)
                    put("dob", dateOfBirth)
                }
                
                val token = sp.getString("supabaseAccessToken", "") ?: ""
                val b = jsonDob.toString().toRequestBody("application/json".toMediaType())
                val reqBuilder = Request.Builder().url("${main.baseUrl}/admin/ensure-patient").post(b)
                if (token.isNotEmpty()) {
                    reqBuilder.header("Authorization", "Bearer $token")
                }
                val req = reqBuilder.build()
                
                main.http.newCall(req).execute()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun currentPatientId(): String {
        val sp = requireContext().getSharedPreferences("vitalink", android.content.Context.MODE_PRIVATE)
        return sp.getString("patientId", null) ?: ""
    }

    private suspend fun refreshReminderNotifications() {
        val main = getMainActivity() ?: return
        withContext(Dispatchers.IO) {
             ReminderScheduler.refresh(requireContext(), main.http, main.baseUrl, currentPatientId())
        }
    }

    private suspend fun syncTodayToServer(
        steps: Long, 
        dist: Long, 
        avgHr: Long, 
        avgSpo2: Int,
        stepRecords: List<StepsRecord>,
        distRecords: List<DistanceRecord>,
        hrRecords: List<HeartRateRecord>,
        spo2Records: List<OxygenSaturationRecord>
    ) {
        val main = getMainActivity() ?: return
        val patientId = currentPatientId()
        if (patientId.isEmpty()) return
        
        val sp = requireContext().getSharedPreferences("vitalink", android.content.Context.MODE_PRIVATE)
        val token = sp.getString("supabaseAccessToken", "") ?: ""

        withContext(Dispatchers.Main) {
            android.widget.Toast.makeText(requireContext(), "Syncing data...", android.widget.Toast.LENGTH_SHORT).show()
        }
        
        withContext(Dispatchers.IO) {
            try {
                val zone = java.time.ZoneId.systemDefault()
                val today = java.time.LocalDate.now(zone)

                // Group records by date to batch uploads
                val allDates = mutableSetOf<java.time.LocalDate>()
                stepRecords.forEach { allDates.add(java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate()) }
                distRecords.forEach { allDates.add(java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate()) }
                hrRecords.forEach { allDates.add(java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate()) }
                spo2Records.forEach { allDates.add(java.time.LocalDateTime.ofInstant(it.time, zone).toLocalDate()) }
                allDates.add(today) // Ensure today is always processed
                
                val sortedDates = allDates.sorted()
                var lastStatusCode = 0
                var anySuccess = false

                for (date in sortedDates) {
                    val isToday = (date == today)
                    val sRecs = stepRecords.filter { java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate() == date }
                    val dRecs = distRecords.filter { java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate() == date }
                    val hRecs = hrRecords.filter { java.time.LocalDateTime.ofInstant(it.startTime, zone).toLocalDate() == date }
                    val oRecs = spo2Records.filter { java.time.LocalDateTime.ofInstant(it.time, zone).toLocalDate() == date }
                    
                    if (!isToday && sRecs.isEmpty() && dRecs.isEmpty() && hRecs.isEmpty() && oRecs.isEmpty()) continue

                    val json = JSONObject().apply {
                        put("patient_id", patientId)
                        put("steps", if (isToday) steps else 0)
                        put("distance", if (isToday) dist else 0)
                        put("avg_hr", if (isToday) avgHr else 0)
                        put("avg_spo2", if (isToday) avgSpo2 else 0)
                        put("date", date.toString())

                        // Add Raw Samples
                        val stepsArray = JSONArray()
                        sRecs.forEach { r ->
                            val item = JSONObject()
                            item.put("startTime", r.startTime.toString())
                            item.put("endTime", r.endTime.toString())
                            item.put("count", r.count)
                            stepsArray.put(item)
                        }
                        put("steps_samples", stepsArray)

                        val distArray = JSONArray()
                        dRecs.forEach { r ->
                            val item = JSONObject()
                            item.put("startTime", r.startTime.toString())
                            item.put("endTime", r.endTime.toString())
                            item.put("distanceMeters", r.distance.inMeters)
                            distArray.put(item)
                        }
                        put("distance_samples", distArray)

                        val hrArray = JSONArray()
                        hRecs.forEach { r ->
                            r.samples.forEach { s ->
                                val item = JSONObject()
                                item.put("time", s.time.toString())
                                item.put("bpm", s.beatsPerMinute)
                                hrArray.put(item)
                            }
                        }
                        put("hr_samples", hrArray)

                        val spo2Array = JSONArray()
                        oRecs.forEach { r ->
                            val item = JSONObject()
                            item.put("time", r.time.toString())
                            item.put("percentage", r.percentage.value)
                            spo2Array.put(item)
                        }
                        put("spo2_samples", spo2Array)
                    }

                    // Sync logic for this batch
                    val url = "${main.baseUrl}/patient/sync-metrics"
                    val body = json.toString().toRequestBody("application/json".toMediaType())
                    val reqBuilder = Request.Builder().url(url).post(body)
                    if (token.isNotEmpty()) {
                        reqBuilder.header("Authorization", "Bearer $token")
                    }
                    val req = reqBuilder.build()
                    val resp = main.http.newCall(req).execute()
                    val code = resp.code
                    resp.close()

                    if (code in 200..299) {
                        anySuccess = true
                    }
                    
                    // If it's today, we care about the status for the UI
                    if (isToday) {
                        lastStatusCode = code
                    } else if (lastStatusCode == 0 && code >= 400) {
                         // If we haven't processed today yet, keep track if something failed earlier?
                         // Actually, let's just use Today's code for UI, or the last error.
                    }
                }

                withContext(Dispatchers.Main) {
                    if (lastStatusCode in 200..299) {
                        val countMsg = "Synced: ${stepRecords.size} steps, ${hrRecords.size} HR, ${spo2Records.size} SpO2"
                        android.widget.Toast.makeText(requireContext(), countMsg, android.widget.Toast.LENGTH_LONG).show()
                        viewModel.statusSteps = lastStatusCode
                        viewModel.statusDist = lastStatusCode
                        viewModel.statusHr = lastStatusCode
                        viewModel.statusSpo2 = lastStatusCode
                        renderCards()
                    } else {
                        // If Today failed (or was never processed?), show error
                        // If Today was empty and skipped, lastStatusCode might be 0.
                        // If lastStatusCode is 0 but we had success on other days, maybe show success?
                        // But UI shows Today's data. If Today is empty, it shows "No Data".
                        // If Today has data and failed, lastStatusCode will be error.
                        
                        if (lastStatusCode == 0 && anySuccess) {
                             // Synced past data, but today had no data or was skipped?
                             // We can consider this a success for "sync" status generally.
                             viewModel.statusSteps = 200
                             viewModel.statusDist = 200
                             viewModel.statusHr = 200
                             viewModel.statusSpo2 = 200
                             renderCards()
                        } else {
                            android.widget.Toast.makeText(requireContext(), "Sync failed", android.widget.Toast.LENGTH_SHORT).show()
                            viewModel.statusSteps = if (lastStatusCode > 0) lastStatusCode else 500
                            viewModel.statusDist = viewModel.statusSteps
                            viewModel.statusHr = viewModel.statusSteps
                            viewModel.statusSpo2 = viewModel.statusSteps
                            renderCards()
                        }
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    android.widget.Toast.makeText(requireContext(), "Sync Error: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                    val errCode = 0
                    viewModel.statusSteps = errCode
                    viewModel.statusDist = errCode
                    viewModel.statusHr = errCode
                    viewModel.statusSpo2 = errCode
                    renderCards()
                }
                e.printStackTrace()
            }
        }
    }

    private fun renderCards() {
        val view = view ?: return
        val context = try { requireContext() } catch(e: Exception) { return }
        
        val layoutLoading = view.findViewById<View>(R.id.layoutLoading)
        val layoutDataCards = view.findViewById<View>(R.id.layoutDataCards)
        val txtNoDataHint = view.findViewById<TextView>(R.id.txtNoDataHint)
        
        // Hide loading, show cards
        layoutLoading?.visibility = View.GONE
        layoutDataCards?.visibility = View.VISIBLE
        
        // Get Today's Data
        var steps = 0L
        var dist = 0.0
        var hrAgg: HrAgg? = null
        var spo2Agg: Spo2Agg? = null

        if (android.os.Build.VERSION.SDK_INT >= 26) {
            try {
                val today = java.time.LocalDate.now().toString()
                steps = viewModel.dailySteps?.get(today) ?: 0L
                dist = viewModel.dailyDist?.get(today) ?: 0.0
                hrAgg = viewModel.dailyHr?.get(today)
                spo2Agg = viewModel.dailySpo2?.get(today)
            } catch (_: Throwable) {}
        }
        
        val avgHr = if (hrAgg != null && hrAgg.count > 0) hrAgg.sum / hrAgg.count else 0L
        val avgSpo2 = if (spo2Agg != null && spo2Agg.count > 0) (spo2Agg.sum / spo2Agg.count).toInt() else 0
        
        // Check if we have any data
        val hasData = steps > 0 || dist > 0 || avgHr > 0 || avgSpo2 > 0
        txtNoDataHint?.visibility = if (hasData) View.GONE else View.VISIBLE
        
        // Update Steps
        view.findViewById<TextView>(R.id.valSteps)?.text = steps.toString()
        val statusStepsTv = view.findViewById<TextView>(R.id.statusSteps)
        if (steps > 0) {
            val code = viewModel.statusSteps
            if (code != null && code in 200..299) {
                statusStepsTv?.text = "Synced"
                statusStepsTv?.setTextColor(ContextCompat.getColor(context, R.color.btnSecondary))
            } else if (code != null) {
                statusStepsTv?.text = "Sync Failed ($code)"
                statusStepsTv?.setTextColor(ContextCompat.getColor(context, R.color.btnDanger))
            } else {
                statusStepsTv?.text = "Not Synced"
                statusStepsTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
            }
        } else {
            statusStepsTv?.text = "No Data"
            statusStepsTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
        }

        // Update Distance
        view.findViewById<TextView>(R.id.valDist)?.text = "%.0f".format(dist)
        val statusDistTv = view.findViewById<TextView>(R.id.statusDist)
        if (dist > 0) {
            val code = viewModel.statusDist
            if (code != null && code in 200..299) {
                statusDistTv?.text = "Synced"
                statusDistTv?.setTextColor(ContextCompat.getColor(context, R.color.btnSecondary))
            } else if (code != null) {
                statusDistTv?.text = "Sync Failed ($code)"
                statusDistTv?.setTextColor(ContextCompat.getColor(context, R.color.btnDanger))
            } else {
                statusDistTv?.text = "Not Synced"
                statusDistTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
            }
        } else {
            statusDistTv?.text = "No Data"
            statusDistTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
        }

        // Update HR
        view.findViewById<TextView>(R.id.valHr)?.text = if (avgHr > 0) avgHr.toString() else "--"
        val statusHrTv = view.findViewById<TextView>(R.id.statusHr)
        if (avgHr > 0) {
            val code = viewModel.statusHr
            if (code != null && code in 200..299) {
                statusHrTv?.text = "Synced"
                statusHrTv?.setTextColor(ContextCompat.getColor(context, R.color.btnSecondary))
            } else if (code != null) {
                statusHrTv?.text = "Sync Failed ($code)"
                statusHrTv?.setTextColor(ContextCompat.getColor(context, R.color.btnDanger))
            } else {
                statusHrTv?.text = "Not Synced"
                statusHrTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
            }
        } else {
            statusHrTv?.text = "No Data"
            statusHrTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
        }

        // Update SpO2
        view.findViewById<TextView>(R.id.valSpo2)?.text = if (avgSpo2 > 0) "$avgSpo2%" else "--"
        val statusSpo2Tv = view.findViewById<TextView>(R.id.statusSpo2)
        if (avgSpo2 > 0) {
            val code = viewModel.statusSpo2
            if (code != null && code in 200..299) {
                statusSpo2Tv?.text = "Synced"
                statusSpo2Tv?.setTextColor(ContextCompat.getColor(context, R.color.btnSecondary))
            } else if (code != null) {
                statusSpo2Tv?.text = "Sync Failed ($code)"
                statusSpo2Tv?.setTextColor(ContextCompat.getColor(context, R.color.btnDanger))
            } else {
                statusSpo2Tv?.text = "Not Synced"
                statusSpo2Tv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
            }
        } else {
            statusSpo2Tv?.text = "No Data"
            statusSpo2Tv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
        }
        
        persistTodaySummary(steps, dist, avgHr, avgSpo2)
    }

    private suspend fun readMetricsAndShow() {
        val view = view ?: return
        val layoutLoading = view.findViewById<View>(R.id.layoutLoading)
        val layoutDataCards = view.findViewById<View>(R.id.layoutDataCards)
        val txtLoadingStatus = view.findViewById<TextView>(R.id.txtLoadingStatus)
        val cardRead = view.findViewById<View>(R.id.cardRead)
        
        val granted = client.permissionController.getGrantedPermissions()
        if (!granted.containsAll(permissions)) {
            val missing = permissions.minus(granted)
            val names = missing.joinToString { it.toString().substringAfterLast(".") }
            android.widget.Toast.makeText(requireContext(), "Missing: $names", android.widget.Toast.LENGTH_SHORT).show()
            return
        }
        
        // Show Loading
        withContext(Dispatchers.Main) {
            layoutLoading?.visibility = View.VISIBLE
            layoutDataCards?.visibility = View.GONE
            txtLoadingStatus?.text = "Reading health data..."
            cardRead?.isEnabled = false
            android.widget.Toast.makeText(requireContext(), "Collecting data...", android.widget.Toast.LENGTH_SHORT).show()
        }

        try {
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                val nowInstant = java.time.Instant.now()
                val zone = java.time.ZoneId.systemDefault()
                
                val endDate = java.time.LocalDateTime.ofInstant(nowInstant, zone).toLocalDate()
                val sevenDaysAgo = nowInstant.minusSeconds(7 * 24 * 60 * 60)
                
                // Fetch Data
                val steps7d = mutableListOf<StepsRecord>()
                var stepsPageToken: String? = null
                do {
                    val resp = client.readRecords(
                        ReadRecordsRequest(
                            StepsRecord::class,
                            timeRangeFilter = TimeRangeFilter.between(sevenDaysAgo, nowInstant),
                            pageToken = stepsPageToken
                        )
                    )
                    steps7d.addAll(resp.records)
                    stepsPageToken = resp.pageToken
                } while (stepsPageToken != null)

                val dist7d = mutableListOf<DistanceRecord>()
                var distPageToken: String? = null
                do {
                    val resp = client.readRecords(
                        ReadRecordsRequest(
                            DistanceRecord::class,
                            timeRangeFilter = TimeRangeFilter.between(sevenDaysAgo, nowInstant),
                            pageToken = distPageToken
                        )
                    )
                    dist7d.addAll(resp.records)
                    distPageToken = resp.pageToken
                } while (distPageToken != null)
                
                val hr7d = mutableListOf<HeartRateRecord>()
                var hrPageToken: String? = null
                do {
                    val resp = client.readRecords(
                        ReadRecordsRequest(
                            HeartRateRecord::class,
                            timeRangeFilter = TimeRangeFilter.between(sevenDaysAgo, nowInstant),
                            pageToken = hrPageToken
                        )
                    )
                    hr7d.addAll(resp.records)
                    hrPageToken = resp.pageToken
                } while (hrPageToken != null)
                
                val spo27d = mutableListOf<OxygenSaturationRecord>()
                var spo2PageToken: String? = null
                do {
                    val resp = client.readRecords(
                        ReadRecordsRequest(
                            OxygenSaturationRecord::class,
                            timeRangeFilter = TimeRangeFilter.between(sevenDaysAgo, nowInstant),
                            pageToken = spo2PageToken
                        )
                    )
                    spo27d.addAll(resp.records)
                    spo2PageToken = resp.pageToken
                } while (spo2PageToken != null)

                // Process Data
                
                val dailySteps = linkedMapOf<String, Long>()
                val dailyDist = linkedMapOf<String, Double>()
                val dailyHr = linkedMapOf<String, HrAgg>()
                val dailySpo2 = linkedMapOf<String, Spo2Agg>()
                
                for (i in 0..6) {
                    val day = endDate.minusDays(i.toLong()).toString()
                    dailySteps[day] = 0L
                    dailyDist[day] = 0.0
                    dailyHr[day] = HrAgg()
                    dailySpo2[day] = Spo2Agg()
                }
                
                steps7d.forEach { r ->
                    val day = java.time.LocalDateTime.ofInstant(r.endTime, zone).toLocalDate().toString()
                    if (dailySteps.containsKey(day)) {
                        dailySteps[day] = (dailySteps[day] ?: 0L) + r.count
                    }
                }

                dist7d.forEach { r ->
                    val day = java.time.LocalDateTime.ofInstant(r.endTime, zone).toLocalDate().toString()
                    if (dailyDist.containsKey(day)) {
                        dailyDist[day] = (dailyDist[day] ?: 0.0) + r.distance.inMeters
                    }
                }
                
                hr7d.forEach { rec ->
                    rec.samples.forEach { s ->
                        val day = java.time.LocalDateTime.ofInstant(s.time, zone).toLocalDate().toString()
                        val bpm = s.beatsPerMinute.toLong()
                        dailyHr[day]?.let { agg ->
                            if (bpm < agg.min) agg.min = bpm
                            if (bpm > agg.max) agg.max = bpm
                            agg.sum += bpm
                            agg.count += 1
                        }
                    }
                }
                
                spo27d.forEach { r ->
                    val day = java.time.LocalDateTime.ofInstant(r.time, zone).toLocalDate().toString()
                    val pct = r.percentage.value
                    dailySpo2[day]?.let { agg ->
                        if (pct < agg.min) agg.min = pct
                        if (pct > agg.max) agg.max = pct
                        agg.sum += pct
                        agg.count += 1
                    }
                }
                
                // Store in ViewModel
                viewModel.dailySteps = dailySteps
                viewModel.dailyDist = dailyDist
                viewModel.dailyHr = dailyHr
                viewModel.dailySpo2 = dailySpo2
                
                viewModel.rawSteps = steps7d
                viewModel.rawDist = dist7d
                viewModel.rawHr = hr7d
                viewModel.rawSpo2 = spo27d
                
                withContext(Dispatchers.Main) {
                    renderCards()
                }
                
                // Sync to server
                val todayKey = endDate.toString()
                val todaySteps = dailySteps[todayKey] ?: 0L
                val todayDist = (dailyDist[todayKey] ?: 0.0).toLong()
                val hrObj = dailyHr[todayKey]
                val todayHr = if (hrObj != null && hrObj.count > 0) hrObj.sum / hrObj.count else 0L
                val spo2Obj = dailySpo2[todayKey]
                val todaySpo2 = if (spo2Obj != null && spo2Obj.count > 0) (spo2Obj.sum / spo2Obj.count).toInt() else 0
                
                // Log counts
                withContext(Dispatchers.Main) {
                    val msg = "Found: ${steps7d.size} steps, ${dist7d.size} dist, ${hr7d.size} hr, ${spo27d.size} spo2"
                    android.util.Log.d("HomeFragment", msg)
                    android.widget.Toast.makeText(requireContext(), msg, android.widget.Toast.LENGTH_LONG).show()
                }

                // Send only TODAY's records to reduce payload size and prevent 502 errors
                val todayZone = java.time.ZoneId.systemDefault()
                val todayDate = java.time.LocalDate.now(todayZone)
                
                val stepsTodayRecs = steps7d.filter { java.time.LocalDateTime.ofInstant(it.startTime, todayZone).toLocalDate() == todayDate }
                val distTodayRecs = dist7d.filter { java.time.LocalDateTime.ofInstant(it.startTime, todayZone).toLocalDate() == todayDate }
                val hrTodayRecs = hr7d.filter { java.time.LocalDateTime.ofInstant(it.startTime, todayZone).toLocalDate() == todayDate }
                val spo2TodayRecs = spo27d.filter { java.time.LocalDateTime.ofInstant(it.time, todayZone).toLocalDate() == todayDate }

                if (todaySteps > 0 || stepsTodayRecs.isNotEmpty() || distTodayRecs.isNotEmpty() || hrTodayRecs.isNotEmpty() || spo2TodayRecs.isNotEmpty()) {
                    syncTodayToServer(todaySteps, todayDist, todayHr, todaySpo2, stepsTodayRecs, distTodayRecs, hrTodayRecs, spo2TodayRecs)
                } else {
                    withContext(Dispatchers.Main) {
                        android.widget.Toast.makeText(requireContext(), "No new data to sync", android.widget.Toast.LENGTH_SHORT).show()
                    }
                }
            }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                 android.widget.Toast.makeText(requireContext(), "Error: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
                 layoutLoading?.visibility = View.GONE
            }
            e.printStackTrace()
        } finally {
            withContext(Dispatchers.Main) {
                cardRead?.isEnabled = true
            }
        }
    }
    
    private fun persistTodaySummary(steps: Long, dist: Double, avgHr: Long, avgSpo2: Int) {
        val sp = requireContext().getSharedPreferences("vitalink", android.content.Context.MODE_PRIVATE)
        val obj = JSONObject()
        obj.put("steps", steps)
        obj.put("dist", dist)
        obj.put("avgHr", avgHr)
        obj.put("avgSpo2", avgSpo2)
        obj.put("statusSteps", viewModel.statusSteps ?: -1)
        obj.put("statusDist", viewModel.statusDist ?: -1)
        obj.put("statusHr", viewModel.statusHr ?: -1)
        obj.put("statusSpo2", viewModel.statusSpo2 ?: -1)
        val dateStr = if (android.os.Build.VERSION.SDK_INT >= 26) java.time.LocalDate.now().toString() else java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
        obj.put("date", dateStr)
        sp.edit().putString("vital_summary", obj.toString()).apply()
    }
    
    private fun renderPersistedSummary() {
        val view = view ?: return
        val context = try { requireContext() } catch(e: Exception) { return }
        val sp = context.getSharedPreferences("vitalink", android.content.Context.MODE_PRIVATE)
        val json = sp.getString("vital_summary", null) ?: return
        val obj = try { JSONObject(json) } catch(e: Exception) { return }
        val steps = obj.optLong("steps", 0L)
        val dist = obj.optDouble("dist", 0.0)
        val avgHr = obj.optLong("avgHr", 0L)
        val avgSpo2 = obj.optInt("avgSpo2", 0)
        val statusSteps = obj.optInt("statusSteps", -1)
        val statusDist = obj.optInt("statusDist", -1)
        val statusHr = obj.optInt("statusHr", -1)
        val statusSpo2 = obj.optInt("statusSpo2", -1)
        val layoutLoading = view.findViewById<View>(R.id.layoutLoading)
        val layoutDataCards = view.findViewById<View>(R.id.layoutDataCards)
        val txtNoDataHint = view.findViewById<TextView>(R.id.txtNoDataHint)
        layoutLoading?.visibility = View.GONE
        layoutDataCards?.visibility = View.VISIBLE
        val hasData = steps > 0 || dist > 0 || avgHr > 0 || avgSpo2 > 0
        txtNoDataHint?.visibility = if (hasData) View.GONE else View.VISIBLE
        view.findViewById<TextView>(R.id.valSteps)?.text = steps.toString()
        val statusStepsTv = view.findViewById<TextView>(R.id.statusSteps)
        if (steps > 0) {
            if (statusSteps in 200..299) {
                statusStepsTv?.text = "Synced"
                statusStepsTv?.setTextColor(ContextCompat.getColor(context, R.color.btnSecondary))
            } else if (statusSteps >= 0) {
                statusStepsTv?.text = "Sync Failed ($statusSteps)"
                statusStepsTv?.setTextColor(ContextCompat.getColor(context, R.color.btnDanger))
            } else {
                statusStepsTv?.text = "Not Synced"
                statusStepsTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
            }
        } else {
            statusStepsTv?.text = "No Data"
            statusStepsTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
        }
        view.findViewById<TextView>(R.id.valDist)?.text = "%.0f".format(dist)
        val statusDistTv = view.findViewById<TextView>(R.id.statusDist)
        if (dist > 0) {
            if (statusDist in 200..299) {
                statusDistTv?.text = "Synced"
                statusDistTv?.setTextColor(ContextCompat.getColor(context, R.color.btnSecondary))
            } else if (statusDist >= 0) {
                statusDistTv?.text = "Sync Failed ($statusDist)"
                statusDistTv?.setTextColor(ContextCompat.getColor(context, R.color.btnDanger))
            } else {
                statusDistTv?.text = "Not Synced"
                statusDistTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
            }
        } else {
            statusDistTv?.text = "No Data"
            statusDistTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
        }
        view.findViewById<TextView>(R.id.valHr)?.text = if (avgHr > 0) avgHr.toString() else "--"
        val statusHrTv = view.findViewById<TextView>(R.id.statusHr)
        if (avgHr > 0) {
            if (statusHr in 200..299) {
                statusHrTv?.text = "Synced"
                statusHrTv?.setTextColor(ContextCompat.getColor(context, R.color.btnSecondary))
            } else if (statusHr >= 0) {
                statusHrTv?.text = "Sync Failed ($statusHr)"
                statusHrTv?.setTextColor(ContextCompat.getColor(context, R.color.btnDanger))
            } else {
                statusHrTv?.text = "Not Synced"
                statusHrTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
            }
        } else {
            statusHrTv?.text = "No Data"
            statusHrTv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
        }
        view.findViewById<TextView>(R.id.valSpo2)?.text = if (avgSpo2 > 0) "$avgSpo2%" else "--"
        val statusSpo2Tv = view.findViewById<TextView>(R.id.statusSpo2)
        if (avgSpo2 > 0) {
            if (statusSpo2 in 200..299) {
                statusSpo2Tv?.text = "Synced"
                statusSpo2Tv?.setTextColor(ContextCompat.getColor(context, R.color.btnSecondary))
            } else if (statusSpo2 >= 0) {
                statusSpo2Tv?.text = "Sync Failed ($statusSpo2)"
                statusSpo2Tv?.setTextColor(ContextCompat.getColor(context, R.color.btnDanger))
            } else {
                statusSpo2Tv?.text = "Not Synced"
                statusSpo2Tv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
            }
        } else {
            statusSpo2Tv?.text = "No Data"
            statusSpo2Tv?.setTextColor(ContextCompat.getColor(context, R.color.hintText))
        }
    }
}
