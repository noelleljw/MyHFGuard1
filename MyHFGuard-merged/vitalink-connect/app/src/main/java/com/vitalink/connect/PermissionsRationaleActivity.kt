package com.vitalink.connect

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class PermissionsRationaleActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Force light theme only - must be called before super.onCreate()
        setTheme(android.R.style.Theme_Material_Light_NoActionBar)
        super.onCreate(savedInstanceState)
        val view = TextView(this)
        view.text = "Health Connect permissions are required to collect health data."
        view.setTextColor(android.graphics.Color.parseColor("#2C3E50"))
        setContentView(view)
    }
}

