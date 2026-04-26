module.exports = (supabase) => async (req, res) => {
  const pid = req.body && req.body.patient_id
  if (!pid) return res.status(400).json({ error: 'missing patient_id' })

  const { steps, distance, avg_hr, avg_spo2, date } = req.body
  if (!date) return res.status(400).json({ error: 'missing date' })

  console.log(`[patient/sync-metrics] syncing for ${pid} on ${date}`)

  try {
    // Upsert steps
    if (steps !== undefined) {
      // Try update first to preserve other fields if any
      const { error, count } = await supabase
        .from('steps_day')
        .update({ steps_total: steps })
        .eq('patient_id', pid)
        .eq('date', date)
        .select()
      
      if (!error && (count === null || count === 0)) {
        await supabase.from('steps_day').insert({
          patient_id: pid,
          date: date,
          steps_total: steps
        })
      }
    }

    // Upsert distance
    if (distance !== undefined) {
      const { error, count } = await supabase
        .from('distance_day')
        .update({ meters_total: distance })
        .eq('patient_id', pid)
        .eq('date', date)
        .select()

      if (!error && (count === null || count === 0)) {
        await supabase.from('distance_day').insert({
          patient_id: pid,
          date: date,
          meters_total: distance
        })
      }
    }

    // Upsert HR
    if (avg_hr !== undefined) {
      const { error, count } = await supabase
        .from('hr_day')
        .update({ hr_avg: avg_hr })
        .eq('patient_id', pid)
        .eq('date', date)
        .select()

      if (!error && (count === null || count === 0)) {
        await supabase.from('hr_day').insert({
          patient_id: pid,
          date: date,
          hr_avg: avg_hr,
          hr_min: avg_hr, // estimate
          hr_max: avg_hr  // estimate
        })
      }
    }

    // Upsert SpO2
    if (avg_spo2 !== undefined) {
      const { error, count } = await supabase
        .from('spo2_day')
        .update({ spo2_avg: avg_spo2 })
        .eq('patient_id', pid)
        .eq('date', date)
        .select()

      if (!error && (count === null || count === 0)) {
        await supabase.from('spo2_day').insert({
          patient_id: pid,
          date: date,
          spo2_avg: avg_spo2,
          spo2_min: avg_spo2, // estimate
          spo2_max: avg_spo2  // estimate
        })
      }
    }
    
    // Update last sync status
    await supabase.from('device_sync_status').upsert({
      patient_id: pid,
      last_sync_ts: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'patient_id' })

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[patient/sync-metrics] error', e)
    return res.status(500).json({ error: e.message })
  }
}
