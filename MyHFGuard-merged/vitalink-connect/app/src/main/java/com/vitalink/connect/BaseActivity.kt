package com.vitalink.connect

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import com.google.android.material.floatingactionbutton.FloatingActionButton

open class BaseActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Apply saved theme preference
        val prefs = getSharedPreferences("vitalink_theme", MODE_PRIVATE)
        val isDark = prefs.getBoolean("is_dark_mode", false)
        if (isDark) {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
        } else {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
        }
    }

    protected fun setupThemeToggle(fabId: Int) {
        val fab = findViewById<FloatingActionButton>(fabId) ?: return
        fab.setOnClickListener {
            val prefs = getSharedPreferences("vitalink_theme", MODE_PRIVATE)
            val isDark = prefs.getBoolean("is_dark_mode", false)
            val newMode = !isDark
            
            prefs.edit().putBoolean("is_dark_mode", newMode).apply()
            
            if (newMode) {
                AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
            } else {
                AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
            }
        }
    }
}