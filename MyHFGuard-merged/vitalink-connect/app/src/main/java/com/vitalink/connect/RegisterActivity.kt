package com.vitalink.connect

import android.os.Bundle
import android.net.Uri
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import java.text.SimpleDateFormat
import java.util.Locale
import okhttp3.MediaType.Companion.toMediaType
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class RegisterActivity : AppCompatActivity() {
    private lateinit var supabase: SupabaseClient
    private lateinit var etFirstName: EditText
    private lateinit var etLastName: EditText
    private lateinit var etDateOfBirth: EditText
    private lateinit var etEmail: EditText
    private lateinit var etPassword: EditText
    private lateinit var btnRegister: Button
    private lateinit var tvLogin: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(android.R.style.Theme_Material_Light_NoActionBar)
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        try {
            // Initialize Supabase
            val supabaseUrl = getString(R.string.supabase_url)
            val supabaseKey = getString(R.string.supabase_anon_key)
            supabase = createSupabaseClient(supabaseUrl, supabaseKey) {
                install(Auth)
            }
        } catch (e: Exception) {
            android.util.Log.e("RegisterActivity", "Failed to initialize Supabase", e)
            Toast.makeText(this, "Failed to initialize app. Please restart.", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        etFirstName = findViewById(R.id.etFirstName)
        etLastName = findViewById(R.id.etLastName)
        etDateOfBirth = findViewById(R.id.etDateOfBirth)
        etEmail = findViewById(R.id.etEmail)
        etPassword = findViewById(R.id.etPassword)
        btnRegister = findViewById(R.id.btnRegister)
        tvLogin = findViewById(R.id.tvLogin)

        btnRegister.setOnClickListener {
            val base = getString(R.string.web_register_url)
            val url = if (base.isNullOrEmpty()) getString(R.string.scan_capture_url) + "register" else base
            startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(url)))
            finish()
        }

        tvLogin.setOnClickListener {
            startActivity(android.content.Intent(this, LoginActivity::class.java))
            finish()
        }
    }

    private fun register() {
        val firstName = etFirstName.text.toString().trim()
        val lastName = etLastName.text.toString().trim()
        val dateOfBirth = etDateOfBirth.text.toString().trim()
        val email = etEmail.text.toString().trim()
        val password = etPassword.text.toString().trim()

        if (firstName.isEmpty() || lastName.isEmpty() || dateOfBirth.isEmpty() || email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
            return
        }

        if (password.length < 6) {
            Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
            return
        }

        btnRegister.isEnabled = false
        lifecycleScope.launch {
            try {
                // Register with Supabase Auth
                val userData = buildJsonObject {
                    put("firstName", firstName)
                    put("lastName", lastName)
                    put("dateOfBirth", dateOfBirth)
                }
                
                supabase.auth.signUpWith(Email) {
                    this.email = email
                    this.password = password
                    this.data = userData
                }

                // Get user ID from the session after sign up
                val session = supabase.auth.currentSessionOrNull()
                val userId = session?.user?.id?.toString()
                if (userId.isNullOrEmpty()) {
                    Toast.makeText(this@RegisterActivity, "Registration failed", Toast.LENGTH_SHORT).show()
                    btnRegister.isEnabled = true
                    return@launch
                }

                // Save patient ID
                val sp = getSharedPreferences("vitalink", MODE_PRIVATE)
                sp.edit().putString("patientId", userId).apply()

                // Create patient record on server
                ensurePatientOnServer(userId, firstName, lastName, dateOfBirth)

                Toast.makeText(this@RegisterActivity, "Registration successful! Please check your email to verify your account.", Toast.LENGTH_LONG).show()
                
                // Navigate to login (user needs to verify email first)
                startActivity(android.content.Intent(this@RegisterActivity, LoginActivity::class.java))
                finish()
            } catch (e: Exception) {
                Toast.makeText(this@RegisterActivity, "Registration failed: ${e.message}", Toast.LENGTH_LONG).show()
                btnRegister.isEnabled = true
            }
        }
    }

    private suspend fun ensurePatientOnServer(patientId: String, firstName: String, lastName: String, dateOfBirth: String) {
        withContext(kotlinx.coroutines.Dispatchers.IO) {
            try {
                val serverUrl = getString(R.string.server_base_url)
                val json = """
                    {
                        "patientId": "$patientId",
                        "firstName": "$firstName",
                        "lastName": "$lastName",
                        "dateOfBirth": "$dateOfBirth"
                    }
                """.trimIndent()

                val mediaType = "application/json; charset=utf-8".toMediaType()
                val request = okhttp3.Request.Builder()
                    .url("$serverUrl/admin/ensure-patient")
                    .post(okhttp3.RequestBody.create(
                        mediaType,
                        json
                    ))
                    .addHeader("Content-Type", "application/json")
                    .build()

                val client = okhttp3.OkHttpClient()
                client.newCall(request).execute()
            } catch (e: Exception) {
                // Log error but don't block registration
                android.util.Log.e("RegisterActivity", "Failed to create patient on server", e)
            }
        }
    }
}

