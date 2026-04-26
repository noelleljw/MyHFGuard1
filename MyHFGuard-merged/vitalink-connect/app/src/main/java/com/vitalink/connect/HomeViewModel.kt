package com.vitalink.connect

import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.OxygenSaturationRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.lifecycle.ViewModel

data class HrAgg(var min: Long = Long.MAX_VALUE, var max: Long = Long.MIN_VALUE, var sum: Long = 0L, var count: Int = 0)
data class Spo2Agg(var min: Double = Double.MAX_VALUE, var max: Double = Double.MIN_VALUE, var sum: Double = 0.0, var count: Int = 0)

class HomeViewModel : ViewModel() {
    // Keys are ISO8601 strings (yyyy-MM-dd) to avoid java.time dependencies in class signature
    var dailySteps: Map<String, Long>? = null
    var dailyDist: Map<String, Double>? = null
    var dailyHr: Map<String, HrAgg>? = null
    var dailySpo2: Map<String, Spo2Agg>? = null
    
    // Raw records for hourly breakdown
    var rawSteps: List<StepsRecord>? = null
    var rawDist: List<DistanceRecord>? = null
    var rawHr: List<HeartRateRecord>? = null
    var rawSpo2: List<OxygenSaturationRecord>? = null
    
    var statusSteps: Int? = null
    var statusDist: Int? = null
    var statusHr: Int? = null
    var statusSpo2: Int? = null
}