package com.vitalink.connect

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class OnboardingActivity : BaseActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check if already logged in
        val sp = getSharedPreferences("vitalink", MODE_PRIVATE)
        val patientId = sp.getString("patientId", null)
        if (!patientId.isNullOrEmpty()) {
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_onboarding)

        findViewById<Button>(R.id.btnLogin).setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
        }

        findViewById<android.widget.TextView>(R.id.btnRegister).setOnClickListener {
            val base = getString(R.string.web_register_url)
            val url = if (base.isNullOrEmpty()) getString(R.string.scan_capture_url) + "register" else base
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            startActivity(intent)
        }
    }
}
