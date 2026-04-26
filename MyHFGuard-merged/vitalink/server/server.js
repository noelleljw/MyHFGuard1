const express = require('express')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ override: true })
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_KEY || null
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
const cors = require('cors');
const app = express()
const processWeightImage = require("./routes/processWeightImage")

// Request logging middleware (moved to top)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200
}));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

app.use(express.json({ limit: '100mb' }))

// Manual CORS headers removed; using cors middleware

let supabase
let supabaseMock = false
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (process.env.SUPABASE_URL && supabaseKey) {
  supabase = createClient(process.env.SUPABASE_URL, supabaseKey)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[server] SUPABASE_SERVICE_ROLE_KEY missing — using SUPABASE_ANON_KEY (admin routes may fail)')
  }
  console.log('[server] supabase configured', { url_present: !!process.env.SUPABASE_URL, role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY })
} else {
  supabaseMock = true
  console.warn('[server] SUPABASE_URL / SUPABASE_KEY missing — using mock supabase (no writes)')
  const api = {
    async upsert() { return { data: [], error: null } },
    async select() { return { data: [], error: null } },
    async insert() { return { data: [], error: null } },
    eq() { return this },
    gte() { return this },
    lte() { return this },
    limit() { return this },
    order() { return this },
    or() { return this },
    from() { return this }
  }
  supabase = { from() { return api }, auth: { admin: { getUserById: async () => ({ error: 'mock' }) } } }
}

async function validatePatientId(patientId) {
  if (!patientId) return { ok: false, error: 'missing patientId' }
  if (supabaseMock) return { ok: true }
  // If we don't have the service role key, we can't use the admin API to validate the user.
  // In this case (likely dev/test), we skip validation to allow the app to function.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true }
  }
  try {
    const r = await supabase.auth.admin.getUserById(patientId)
    if (r.error) return { ok: false, error: r.error.message }
    const u = r.data && r.data.user
    if (!u) return { ok: false, error: 'user not found' }
    const role = (u.app_metadata && u.app_metadata.role) || null
    if (role !== 'patient') return { ok: false, error: 'user is not patient' }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) }
  }
}
function toHourWithOffset(ts, offsetMin) {
  const off = (offsetMin === undefined || offsetMin === null) ? 480 : offsetMin
  const d = new Date(Date.parse(ts) + off * 60000)
  d.setUTCMinutes(0, 0, 0)
  return d.toISOString()
}
function toDateWithOffset(ts, offsetMin) {
  const off = (offsetMin === undefined || offsetMin === null) ? 480 : offsetMin
  const d = new Date(Date.parse(ts) + off * 60000)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
async function ensurePatient(patientId, info) {
  if (!patientId) return { ok: false, error: 'missing patientId' }

  // Get existing patient data if it exists
  let existing = null
  try {
    const existingRes = await supabase.from('patients').select('dob, first_name, last_name').eq('patient_id', patientId).maybeSingle()
    if (existingRes && existingRes.data) {
      existing = existingRes.data
    }
  } catch (e) {
    // If query fails, continue without existing data
  }

  // Use provided values, fall back to existing values if patient exists
  const first = (info && info.firstName) || (existing && existing.first_name) || null
  const last = (info && info.lastName) || (existing && existing.last_name) || null
  const dob = (info && info.dateOfBirth) || (existing && existing.dob) || null

  // Build row - dob is required (NOT NULL constraint)
  const row = {
    patient_id: patientId,
  }

  if (first) row.first_name = first
  if (last) row.last_name = last

  // dob is required - if not provided and patient doesn't exist, return error
  if (!dob && !existing) {
    return { ok: false, error: 'dateOfBirth is required for new patients' }
  }

  // Only set dob if we have a value (for new patients) or if updating existing
  if (dob) {
    row.dob = dob
  } else if (existing && existing.dob) {
    // Keep existing dob if not provided in update
    row.dob = existing.dob
  }

  // Use upsert with onConflict to update existing or insert new
  const res = await supabase
    .from('patients')
    .upsert([row], {
      onConflict: 'patient_id',
      ignoreDuplicates: false
    })

  if (res.error) {
    console.error('ensurePatient error', res.error)
    return { ok: false, error: res.error.message }
  }
  console.log('[ensurePatient] success', row.patient_id)
  return { ok: true }
}
async function ensureOrigins(origins) {
  if (!origins.length) return { ok: true }
  const rows = origins.map((o) => ({ origin_id: o }))
  const res = await supabase.from('data_origin').upsert(rows, { onConflict: 'origin_id' })
  if (res.error) {
    console.error('ensureOrigins error', res.error)
    return { ok: false, error: res.error.message }
  }
  return { ok: true }
}
async function ensureDevices(devices, patientId) {
  if (!devices.length) return { ok: true }
  const rows = devices.map((d) => ({ device_id: d, patient_id: patientId }))
  const res = await supabase.from('devices').upsert(rows, { onConflict: 'device_id' })
  if (res.error) {
    console.error('ensureDevices error', res.error)
    return { ok: false, error: res.error.message }
  }
  return { ok: true }
}
app.get('/health', (req, res) => {
  console.log('[health] ping ok')
  return res.status(200).send('ok')
})

// Connectivity/debug endpoint
app.get('/debug/connectivity', async (req, res) => {
  const start = Date.now()
  console.log('[debug] connectivity check start')
  const out = { ok: true, supabase: null, timeMs: null }
  try {
    const ping = await supabase.from('patients').select('patient_id').limit(1)
    out.supabase = ping.error ? { ok: false, error: ping.error.message } : { ok: true, count: (ping.data || []).length }
  } catch (e) {
    out.supabase = { ok: false, error: e && e.message ? e.message : String(e) }
  }
  out.timeMs = Date.now() - start
  console.log('[debug] connectivity result', out)
  return res.status(200).json(out)
})
app.post('/admin/ensure-patient', async (req, res) => {
  const pid = req.body && req.body.patientId
  if (!pid) return res.status(400).json({ error: 'missing patientId' })
  const info = {
    firstName: req.body && req.body.firstName,
    lastName: req.body && req.body.lastName,
    dateOfBirth: req.body && req.body.dateOfBirth,
  }
  const r = await ensurePatient(pid, info)
  if (!r.ok) return res.status(400).json({ ok: false, error: r.error })
  try {
    const u = await supabase.auth.admin.getUserById(pid)
    const role = (u && u.data && u.data.user && u.data.user.app_metadata && u.data.user.app_metadata.role) || null
    if (role !== 'patient') {
      await supabase.auth.admin.updateUserById(pid, { app_metadata: { role: 'patient' } })
    }
  } catch (_) { }
  return res.status(200).json({ ok: true })
})

if (process.env.ENABLE_DEV_ROUTES === 'true') {
  try {
    require('./dev/devRoutes')(app, supabase, ensurePatient, supabaseMock)
  } catch (e) {
    console.warn('dev routes not loaded', e && e.message ? e.message : e)
  }
}

app.get('/admin/users', async (req, res) => {
  console.log('[admin/users] list patients')
  const out = { users: [] }
  const rows = await supabase.from('patients').select('patient_id').limit(1000)
  if (rows.error) return res.status(400).json({ error: rows.error.message })
  out.users = (rows.data || []).map((r) => r.patient_id)
  return res.status(200).json(out)
})
app.get('/admin/summary', async (req, res) => {
  console.log('[admin/summary] start')
  const users = await supabase.from('patients').select('patient_id').limit(1000)
  if (users.error) return res.status(400).json({ error: users.error.message })
  const ids = (users.data || []).map((r) => r.patient_id)
  const out = []
  for (const pid of ids) {
    const s = await supabase.from('steps_day').select('date,steps_total').eq('patient_id', pid).order('date', { ascending: false }).limit(1)
    const h = await supabase.from('hr_day').select('date,hr_min,hr_max,hr_avg,hr_count').eq('patient_id', pid).order('date', { ascending: false }).limit(1)
    const o = await supabase.from('spo2_day').select('date,spo2_min,spo2_max,spo2_avg,spo2_count').eq('patient_id', pid).order('date', { ascending: false }).limit(1)
    out.push({
      patientId: pid,
      steps: (s.data && s.data[0]) || null,
      hr: (h.data && h.data[0]) || null,
      spo2: (o.data && o.data[0]) || null,
    })
  }
  console.log('[admin/summary] count', out.length)
  return res.status(200).json({ summary: out })
})

// Get patient info for admin
app.get('/admin/patient-info', async (req, res) => {
  const pid = req.query && req.query.patientId
  console.log(`[admin/patient-info] fetching for pid: ${pid}`)
  if (!pid) return res.status(400).json({ error: 'missing patientId' })

  try {
    const patientRes = await supabase
      .from('patients')
      .select('patient_id, first_name, last_name, dob')
      .eq('patient_id', pid)
      .single()

    if (patientRes.error) {
      console.error('[admin/patient-info] error fetching patient:', patientRes.error)
      return res.status(404).json({ error: 'Patient not found', details: patientRes.error })
    }

    console.log('[admin/patient-info] found patient:', patientRes.data.first_name)

    const devicesRes = await supabase
      .from('devices')
      .select('device_id')
      .eq('patient_id', pid)

    const devicesCount = devicesRes.data ? devicesRes.data.length : 0

    return res.status(200).json({
      patient: {
        patient_id: patientRes.data.patient_id,
        first_name: patientRes.data.first_name,
        last_name: patientRes.data.last_name,
        dob: patientRes.data.dob
      },
      devicesCount,
      warnings: []
    })
  } catch (error) {
    console.error('Error fetching patient info:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

const getPatientsRoute = require('./routes/admin/getPatients')(supabase);
app.get('/api/admin/patients', getPatientsRoute);

// Admin login endpoint
const adminLoginRoute = require('./routes/admin/login')(supabase);
app.post('/api/admin/login', adminLoginRoute);


// --- MEDICATION ROUTES ---
app.get('/patient/medications', async (req, res) => {
  const pid = req.query.patientId
  if (!pid) return res.status(400).json({ error: 'missing patientId' })

  try {
    const { data, error } = await supabase
      .from('medication')
      .select('*')
      .eq('patient_id', pid)

    if (error) throw error

    const prefs = {
      beta_blockers: false,
      raas_inhibitors: false,
      mras: false,
      sglt2_inhibitors: false,
      statin: false,
      notify_hour: 9
    }

    if (data) {
      data.forEach(m => {
        if (m.class && prefs.hasOwnProperty(m.class)) {
          prefs[m.class] = m.active
        }
      })
    }

    return res.status(200).json({ preferences: prefs })
  } catch (e) {
    console.error('[medications] get error:', e)
    return res.status(500).json({ error: e.message })
  }
})

app.post('/patient/medications', async (req, res) => {
  const { patientId, ...prefs } = req.body
  if (!patientId) return res.status(400).json({ error: 'missing patientId' })

  try {
    // 1. Get existing medications to find IDs
    const { data: existing, error: fetchError } = await supabase
      .from('medication')
      .select('*')
      .eq('patient_id', patientId)

    if (fetchError) throw fetchError

    const updates = []
    const inserts = []

    const categories = {
      beta_blockers: 'Beta Blockers',
      raas_inhibitors: 'RAAS Inhibitors',
      mras: 'MRAs',
      sglt2_inhibitors: 'SGLT2 Inhibitors',
      statin: 'Statin'
    }

    Object.keys(categories).forEach(key => {
      if (prefs.hasOwnProperty(key)) {
        const isActive = prefs[key]
        const match = existing ? existing.find(m => m.class === key) : null

        if (match) {
          // Update if active status changed
          if (match.active !== isActive) {
            updates.push({
              id: match.id,
              active: isActive,
              updated_at: new Date().toISOString()
            })
          }
        } else {
          inserts.push({
            patient_id: patientId,
            name: categories[key],
            class: key,
            active: isActive
          })
        }
      }
    })

    console.log('[medications] computed', { patientId, updatesCount: updates.length, insertsCount: inserts.length })

    if (updates.length > 0) {
      for (const u of updates) {
        const { error } = await supabase.from('medication').update({ active: u.active, updated_at: u.updated_at }).eq('id', u.id)
        if (error) throw error
      }
    }

    if (inserts.length > 0) {
      const payload = inserts.map((x) => ({ ...x, patient_id: patientId }))
      console.log('[medications] insert payload', payload)
      const { error } = await supabase.from('medication').insert(payload)
      if (error) throw error
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[medications] save error:', e)
    return res.status(500).json({ error: e.message })
  }
})

// --- SYNC METRICS ROUTE ---
app.post('/patient/sync-metrics', async (req, res) => {
  const { patient_id, steps_samples, hr_samples, distance_samples, spo2_samples, date } = req.body

  if (!patient_id) {
    return res.status(400).json({ error: 'Missing patient_id' })
  }

  // Use authenticated client if token provided, to bypass RLS
  let sb = supabase
  const authHeader = req.headers.authorization
  if (authHeader) {
    sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
  }

  console.log(`[sync-metrics] Syncing for ${patient_id} on ${date || 'unknown date'} (Auth: ${!!authHeader})`)

  // Helper to process metrics consistently with /ingest/ routes
  // Includes: Raw Upsert, Hour Aggregation, Day Aggregation
  const processMetric = async (label, items, rawTable, hourTable, dayTable, mapRaw, aggFn, finalizeFn) => {
    if (!items || items.length === 0) return

    // 1. Upsert Raw
    const rawRows = items.map(i => {
      const ts = i.time || i.startTime || i.timeTs
      // Generate deterministic UID to avoid duplicates if re-synced
      // We use patient_id + label + timestamp
      const uid = `${patient_id}-${label}-${ts}`
      return { ...mapRaw(i), patient_id, record_uid: uid }
    })

    const { error: errRaw } = await sb.from(rawTable).upsert(rawRows, { onConflict: 'record_uid', ignoreDuplicates: true })
    if (errRaw) console.error(`[sync-metrics] ${label} raw error:`, errRaw.message)

    // 2. Aggregate Hour & Day
    const hourMap = new Map()
    const dayMap = new Map()

    for (const i of items) {
      const ts = i.time || i.endTime || i.startTime
      // Bucket by Malaysia Time (UTC+8) for hour aggregates
      const h = toHourWithOffset(ts, 480)
      const d = toDateWithOffset(ts, 480)
      aggFn(hourMap, h, i)
      aggFn(dayMap, d, i)
    }

    // 3. Upsert Aggregates
    const hourRows = []
    for (const [h, val] of hourMap) {
      const final = finalizeFn ? finalizeFn(val) : val
      hourRows.push({ patient_id, hour_ts: h, ...final })
    }
    if (hourRows.length) {
      const { error } = await sb.from(hourTable).upsert(hourRows, { onConflict: 'patient_id, hour_ts' })
      if (error) console.error(`[sync-metrics] ${label} hour error:`, error.message)
    }

    const dayRows = []
    for (const [d, val] of dayMap) {
      const final = finalizeFn ? finalizeFn(val) : val
      dayRows.push({ patient_id, date: d, ...final })
    }
    if (dayRows.length) {
      const { error } = await sb.from(dayTable).upsert(dayRows, { onConflict: 'patient_id, date' })
      if (error) console.error(`[sync-metrics] ${label} day error:`, error.message)
    }
  }

  try {
    // STEPS
    await processMetric(
      'steps',
      steps_samples,
      'steps_event',
      'steps_hour',
      'steps_day',
      (i) => ({ start_ts: i.startTime, end_ts: i.endTime, count: i.count }),
      (map, key, i) => map.set(key, (map.get(key) || 0) + i.count),
      (val) => ({ steps_total: val })
    )

    // DISTANCE
    await processMetric(
      'distance',
      distance_samples,
      'distance_event',
      'distance_hour',
      'distance_day',
      (i) => ({ start_ts: i.startTime, end_ts: i.endTime, meters: Math.round(i.distanceMeters) }),
      (map, key, i) => map.set(key, (map.get(key) || 0) + i.distanceMeters),
      (val) => ({ meters_total: Math.round(val) })
    )

    // HR
    await processMetric(
      'hr',
      hr_samples,
      'hr_sample',
      'hr_hour',
      'hr_day',
      (i) => ({ time_ts: i.time, bpm: i.bpm }),
      (map, key, i) => {
        const curr = map.get(key) || { min: 999, max: 0, sum: 0, count: 0 }
        curr.min = Math.min(curr.min, i.bpm)
        curr.max = Math.max(curr.max, i.bpm)
        curr.sum += i.bpm
        curr.count++
        map.set(key, curr)
      },
      (val) => ({ hr_min: Math.round(val.min), hr_max: Math.round(val.max), hr_avg: Math.round(val.sum / val.count), hr_count: val.count })
    )

    // SPO2
    await processMetric(
      'spo2',
      spo2_samples,
      'spo2_sample',
      'spo2_hour',
      'spo2_day',
      (i) => ({ time_ts: i.time, spo2_pct: i.percentage }),
      (map, key, i) => {
        const curr = map.get(key) || { min: 999, max: 0, sum: 0, count: 0 }
        curr.min = Math.min(curr.min, i.percentage)
        curr.max = Math.max(curr.max, i.percentage)
        curr.sum += i.percentage
        curr.count++
        map.set(key, curr)
      },
      (val) => ({ spo2_min: Math.round(val.min), spo2_max: Math.round(val.max), spo2_avg: Math.round(val.sum / val.count), spo2_count: val.count })
    )

    try {
      const offsetMin = 480
      const candidates = []
        ; (steps_samples || []).forEach(s => {
          if (s.endTime) {
            const utcMs = new Date(s.endTime).getTime()
            const localMs = utcMs + offsetMin * 60000
            candidates.push({ utcMs, localMs, ts: s.endTime })
          }
        })
        ; (distance_samples || []).forEach(s => {
          if (s.endTime) {
            const utcMs = new Date(s.endTime).getTime()
            const localMs = utcMs + offsetMin * 60000
            candidates.push({ utcMs, localMs, ts: s.endTime })
          }
        })
        ; (hr_samples || []).forEach(s => {
          if (s.time) {
            const utcMs = new Date(s.time).getTime()
            const localMs = utcMs + offsetMin * 60000
            candidates.push({ utcMs, localMs, ts: s.time })
          }
        })
        ; (spo2_samples || []).forEach(s => {
          if (s.time) {
            const utcMs = new Date(s.time).getTime()
            const localMs = utcMs + offsetMin * 60000
            candidates.push({ utcMs, localMs, ts: s.time })
          }
        })
      if (candidates.length) {
        const best = candidates.reduce((m, c) => (c.localMs > m.localMs ? c : m))
        const maxTs = new Date(best.ts).toISOString()
        await sb.from('device_sync_status').upsert({ patient_id, last_sync_ts: maxTs, updated_at: new Date().toISOString() }, { onConflict: 'patient_id' })
      }
    } catch (_) { }
    return res.status(200).json({ ok: true })

  } catch (e) {
    console.error('[sync-metrics] exception:', e)
    return res.status(500).json({ error: e.message })
  }
})



// --- Blood Pressure Module Routes ---

// multer setup
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage: storage });
const uploadMiddleware = upload.single('image');

// Import BP module routes
let processImageRoute, addManualEventRoute, getHealthEventsRoute;
try {
  processImageRoute = require('./routes/bp/processImage')(supabase, uploadMiddleware);
  addManualEventRoute = require('./routes/bp/addManualEvent')(supabase);
  getHealthEventsRoute = require('./routes/bp/getHealthEvents')(supabase);
  console.log('[server] BP routes loaded successfully');
} catch (err) {
  console.error('[server] Error loading BP routes:', err);
  process.exit(1);
}

// Register BP routes
app.post('/api/process-image', processImageRoute);
app.post('/api/add-manual-event', addManualEventRoute);
app.get('/api/health-events', getHealthEventsRoute);

// Debug route to list available Gemini models
app.get('/api/debug/models', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY
    if (!key) return res.status(500).json({ error: 'No GEMINI_API_KEY set' })

    // Use global fetch (Node 18+)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    if (!response.ok) {
      const errText = await response.text()
      return res.status(response.status).json({ error: 'Failed to list models', details: errText })
    }
    const data = await response.json()
    return res.json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})


// --- DIAGNOSTIC ROUTE ---
app.get('/api/debug/list-models', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    // We use a raw fetch to bypass the SDK and ask Google directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    // Log to server console so user can see it in Render logs
    console.log('[Diagnostic] Available Models:', JSON.stringify(data, null, 2));

    // This will return a list of "name": "models/..."
    res.json(data);
  } catch (error) {
    console.error('[Diagnostic] Error listing models:', error);
    res.status(500).json({ error: error.message });
  }
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableGeminiError(error) {
  const msg = String(error?.message || error || '')
  return (
    msg.includes('503') ||
    msg.includes('Service Unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('unavailable')
  )
}

async function generateWithRetry(prompt, systemInstruction) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

  const modelNames = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-2.0-flash'
  ]

  let lastError = null

  for (const modelName of modelNames) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction
    })

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Gemini] Trying model=${modelName}, attempt=${attempt}`)
        const result = await model.generateContent(prompt)
        const response = result.response
        const text = response.text()
        return text
      } catch (error) {
        lastError = error
        console.error(`[Gemini] Failed model=${modelName}, attempt=${attempt}:`, error?.message || error)

        if (!isRetryableGeminiError(error)) {
          throw error
        }

        if (attempt < 3) {
          const delay = 1000 * attempt
          console.log(`[Gemini] Retry in ${delay}ms`)
          await sleep(delay)
        }
      }
    }
  }

  throw lastError || new Error('Gemini request failed')
}

// AI Symptom Checker Route
app.post('/api/chat/symptoms', async (req, res) => {
  console.log('[symptomChecker] Request received', { body: req.body })

  try {
    const { message, patientId } = req.body

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' })
    }

    const userMessage = String(message).trim()

    // Strict topic filter
    const allowedKeywords = [
      'heart failure', 'hf', 'symptom', 'symptoms',
      'blood pressure', 'bp', 'systolic', 'diastolic',
      'heart rate', 'pulse', 'spo2', 'oxygen', 'o2',
      'weight', 'weight gain', 'swelling', 'leg swelling',
      'breathless', 'shortness of breath', 'breathing',
      'orthopnea', 'cough', 'abdomen', 'abdominal discomfort',
      'medication', 'medicine', 'drug', 'tablet', 'pill',
      'reminder', 'appointment', 'doctor', 'clinic', 'hospital',
      'chest pain', 'dizzy', 'fatigue', 'tired',
      'steps', 'walking', 'exercise', 'vitals', 'health data',
      'log', 'record', 'reading'
    ]

    const lowerMsg = userMessage.toLowerCase()
    const isAllowed = allowedKeywords.some((keyword) => lowerMsg.includes(keyword))

    if (!isAllowed) {
      return res.status(200).json({
        reply:
          "I can only help with heart failure, symptoms, medication, reminders, vitals, and related health questions in MyHFGuard. Please ask about your health records, symptoms, blood pressure, SpO2, weight, exercise, or medication.",
        timestamp: new Date().toISOString()
      })
    }

    const healthData = await fetchPatientHealthData(patientId)

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: `You are MyHFGuard AI, a STRICT heart-failure support assistant.

VERY IMPORTANT RULES:
1. ONLY answer questions related to:
   - heart failure
   - symptoms
   - blood pressure
   - heart rate
   - SpO2
   - weight
   - medication
   - reminders
   - exercise / steps
   - patient health logs
   - when to contact a doctor or emergency services

2. If the user asks anything outside those topics, DO NOT answer it.
   Instead say:
   "I can only help with heart failure, symptoms, medication, reminders, vitals, and related health questions in MyHFGuard."

3. DO NOT answer:
   - maths
   - celebrity / idol questions
   - entertainment
   - school homework
   - coding
   - general knowledge
   - unrelated chat

4. Use simple language.
5. Keep answers short and clear.
6. Do not diagnose.
7. If symptoms sound dangerous, tell the user to seek emergency help immediately.

PATIENT CONTEXT:
${healthData.summary}

RECENT VITALS:
- Heart Rate: ${healthData.hr}
- Blood Pressure: ${healthData.bp}
- SpO2: ${healthData.spo2}
- Weight: ${healthData.weight}
- Steps: ${healthData.steps}
- Recent Symptoms: ${healthData.symptoms}
- Current Medications: ${healthData.medications}`
    })

    const result = await model.generateContent(userMessage)
    const response = result.response
    const text = response.text()

    return res.status(200).json({
      reply: text,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Symptom checker error:', error)
    return res.status(500).json({
      error: 'Failed to process your request. Please try again.',
      details: error.message
    })
  }
})

// Helper function to fetch patient health data
async function fetchPatientHealthData(patientId) {
  try {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    const dateStr = sevenDaysAgo.toISOString().split('T')[0]

    // Fetch recent vitals
    const [hrData, bpData, spo2Data, weightData, stepsData, symptomsData, medicationsData] = await Promise.all([
      // Heart Rate - last 7 days
      supabase
        .from('hr_day')
        .select('date, hr_min, hr_max, hr_avg')
        .eq('patient_id', patientId)
        .gte('date', dateStr)
        .order('date', { ascending: false })
        .limit(7),

      // Blood Pressure - last 7 readings
      supabase
        .from('bp_readings')
        .select('reading_date, reading_time, systolic, diastolic, pulse')
        .eq('patient_id', patientId)
        .order('reading_date', { ascending: false })
        .order('reading_time', { ascending: false })
        .limit(7),

      // SpO2 - last 7 days
      supabase
        .from('spo2_day')
        .select('date, spo2_min, spo2_max, spo2_avg')
        .eq('patient_id', patientId)
        .gte('date', dateStr)
        .order('date', { ascending: false })
        .limit(7),

      // Weight - last 7 days
      supabase
        .from('weight_day')
        .select('date, kg_min, kg_max, kg_avg')
        .eq('patient_id', patientId)
        .gte('date', dateStr)
        .order('date', { ascending: false })
        .limit(7),

      // Steps - last 7 days
      supabase
        .from('steps_day')
        .select('date, steps_total')
        .eq('patient_id', patientId)
        .gte('date', dateStr)
        .order('date', { ascending: false })
        .limit(7),

      // Symptoms - last 7 days
      supabase
        .from('symptom_log')
        .select('date, cough, sob_activity, leg_swelling, sudden_weight_gain, abd_discomfort, orthopnea, notes')
        .eq('patient_id', patientId)
        .gte('date', dateStr)
        .order('date', { ascending: false })
        .limit(7),

      // Current medications
      supabase
        .from('medication')
        .select('name, class')
        .eq('patient_id', patientId)
        .eq('active', true)
    ])

    // Format the data
    const formatHR = (data) => {
      if (!data || data.length === 0) return 'No recent data'
      const latest = data[0]
      return `Latest: ${latest.hr_avg} bpm (range: ${latest.hr_min}-${latest.hr_max}), Trend: ${data.length} days recorded`
    }

    const formatBP = (data) => {
      if (!data || data.length === 0) return 'No recent data'
      const latest = data[0]
      return `Latest: ${latest.systolic}/${latest.diastolic} mmHg, Pulse: ${latest.pulse} bpm, ${data.length} readings in past week`
    }

    const formatSpO2 = (data) => {
      if (!data || data.length === 0) return 'No recent data'
      const latest = data[0]
      return `Latest: ${latest.spo2_avg}% (range: ${latest.spo2_min}-${latest.spo2_max}%), ${data.length} days recorded`
    }

    const formatWeight = (data) => {
      if (!data || data.length === 0) return 'No recent data'
      const latest = data[0]
      const oldest = data[data.length - 1]
      const change = latest.kg_avg - oldest.kg_avg
      return `Latest: ${latest.kg_avg} kg, Change over week: ${change > 0 ? '+' : ''}${change.toFixed(1)} kg`
    }

    const formatSteps = (data) => {
      if (!data || data.length === 0) return 'No recent data'
      const avg = data.reduce((sum, d) => sum + d.steps_total, 0) / data.length
      return `Average: ${Math.round(avg)} steps/day over ${data.length} days`
    }

    const formatSymptoms = (data) => {
      if (!data || data.length === 0) return 'No symptoms logged recently'
      const latest = data[0]
      const symptoms = []
      if (latest.cough > 0) symptoms.push(`Cough (${latest.cough}/5)`)
      if (latest.sob_activity > 0) symptoms.push(`Shortness of breath (${latest.sob_activity}/5)`)
      if (latest.leg_swelling > 0) symptoms.push(`Leg swelling (${latest.leg_swelling}/5)`)
      if (latest.sudden_weight_gain > 0) symptoms.push(`Weight gain (${latest.sudden_weight_gain}/5)`)
      if (latest.abd_discomfort > 0) symptoms.push(`Abdominal discomfort (${latest.abd_discomfort}/5)`)
      if (latest.orthopnea > 0) symptoms.push(`Difficulty sleeping flat (${latest.orthopnea}/5)`)
      if (latest.notes) symptoms.push(`Notes: ${latest.notes}`)
      return symptoms.length > 0 ? symptoms.join(', ') : 'No significant symptoms'
    }

    const formatMedications = (data) => {
      if (!data || data.length === 0) return 'No active medications'
      return data.map(m => `${m.name} (${m.class})`).join('; ')
    }

    return {
      summary: 'Heart failure patient being monitored through MyHFGuard App',
      hr: formatHR(hrData.data),
      bp: formatBP(bpData.data),
      spo2: formatSpO2(spo2Data.data),
      weight: formatWeight(weightData.data),
      steps: formatSteps(stepsData.data),
      symptoms: formatSymptoms(symptomsData.data),
      medications: formatMedications(medicationsData.data)
    }

  } catch (error) {
    console.error('[Helper fetchPatientHealthData] Error fetching patient health data:', error)
    return {
      summary: 'Unable to fetch patient data',
      hr: 'N/A',
      bp: 'N/A',
      spo2: 'N/A',
      weight: 'N/A',
      steps: 'N/A',
      symptoms: 'N/A',
      medications: 'N/A'
    }
  }
}


// Health Check
const healthHandler = (req, res) => {
  const usingServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  res.json({
    status: 'ok',
    service: 'vitalink-server',
    supabase: {
      connected: !!supabase,
      usingServiceKey: usingServiceKey, // This tells us if we have admin privileges
      mode: usingServiceKey ? 'admin' : 'anon'
    }
  })
}

app.get('/api/health', healthHandler)
app.get('/health', healthHandler)


// Sync metrics endpoint
// const syncMetricsRoute = require('./routes/patient/syncMetrics')(supabase);
// app.post('/patient/sync-metrics', syncMetricsRoute);


// Check daily log status (weight, bp, symptoms)
app.get('/patient/daily-status', async (req, res) => {
  const { patientId, date } = req.query
  if (!patientId || !date) return res.status(400).json({ error: 'Missing params' })
  try {
    if (supabaseMock) {
      return res.json({ has_weight: false, has_bp: false, has_symptoms: false })
    }
    const w = await supabase.from('weight_day').select('date').eq('patient_id', patientId).eq('date', date).maybeSingle()
    const bp = await supabase.from('bp_readings').select('reading_date').eq('patient_id', patientId).eq('reading_date', date).maybeSingle()
    const s = await supabase.from('symptom_log').select('date').eq('patient_id', patientId).eq('date', date).maybeSingle()
    return res.json({
      has_weight: !!(w && w.data),
      has_bp: !!(bp && bp.data),
      has_symptoms: !!(s && s.data)
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Check weekly log status (weight, symptoms) for last 7 days ending on endDate (or today)
app.get('/patient/weekly-status', async (req, res) => {
  const { patientId, endDate } = req.query
  if (!patientId) return res.status(400).json({ error: 'Missing patientId' })
  try {
    const end = endDate ? new Date(endDate) : new Date()
    // Ensure we include the full end date
    const endStr = end.toISOString().slice(0, 10)

    const start = new Date(end)
    start.setDate(start.getDate() - 6) // Last 7 days including today
    const startStr = start.toISOString().slice(0, 10)

    if (supabaseMock) {
      // Mock response
      const m = {}
      const curr = new Date(start)
      while (curr <= end) {
        const iso = curr.toISOString().slice(0, 10)
        m[iso] = { has_weight: false, has_symptoms: false }
        curr.setDate(curr.getDate() + 1)
      }
      return res.json(m)
    }

    const w = await supabase.from('weight_day').select('date').eq('patient_id', patientId).gte('date', startStr).lte('date', endStr)
    const s = await supabase.from('symptom_log').select('date').eq('patient_id', patientId).gte('date', startStr).lte('date', endStr)

    const map = {}
    const curr = new Date(start)
    while (curr <= end) {
      const iso = curr.toISOString().slice(0, 10)
      map[iso] = { has_weight: false, has_symptoms: false }
      curr.setDate(curr.getDate() + 1)
    }

    if (w.data) {
      w.data.forEach(x => {
        if (map[x.date]) map[x.date].has_weight = true
      })
    }
    if (s.data) {
      s.data.forEach(x => {
        if (map[x.date]) map[x.date].has_symptoms = true
      })
    }

    return res.json(map)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Patient endpoints for dashboard
app.get('/patient/summary', async (req, res) => {
  const pid = (req.query && req.query.patientId)
  if (!pid) return res.status(400).json({ error: 'missing patientId' })
  if (supabaseMock) {
    const summary = {
      heartRate: null,
      bpSystolic: null,
      bpDiastolic: null,
      bpPulse: null,
      weightKg: null,
      nextAppointmentDate: null,
      stepsToday: null,
      distanceToday: null,
      lastSyncTs: null,
    }
    return res.status(200).json({ summary })
  }
  const hr = await supabase.from('hr_day').select('date,hr_avg').eq('patient_id', pid).order('date', { ascending: false }).limit(1)
  if (hr.error) return res.status(400).json({ error: hr.error.message })
  const row = (hr.data && hr.data[0]) || null
  const st = await supabase.from('steps_day').select('date,steps_total').eq('patient_id', pid).order('date', { ascending: false }).limit(1)
  if (st.error) return res.status(400).json({ error: st.error.message })
  const srow = (st.data && st.data[0]) || null
  const dist = await supabase.from('distance_day').select('date,meters_total').eq('patient_id', pid).order('date', { ascending: false }).limit(1)
  const drow = (dist.data && dist.data[0]) || null
  const bp = await supabase.from('bp_readings').select('systolic,diastolic,pulse').eq('patient_id', pid).order('reading_date', { ascending: false }).order('reading_time', { ascending: false }).limit(1)
  const bpRow = (bp.data && bp.data[0]) || null
  const wt = await supabase.from('weight_day').select('date,kg_avg').eq('patient_id', pid).order('date', { ascending: false }).limit(1)
  const wRow = (wt.data && wt.data[0]) || null
  let lastSyncTs = null
  try {
    const sync = await supabase.from('device_sync_status').select('last_sync_ts,updated_at').eq('patient_id', pid).order('last_sync_ts', { ascending: false }).limit(1)
    const srow2 = (sync.data && sync.data[0]) || null
    lastSyncTs = (srow2 && (srow2.last_sync_ts || srow2.updated_at)) || null
  } catch (_) { }
  if (!lastSyncTs) {
    try {
      const hrLast = await supabase.from('hr_sample').select('time_ts').eq('patient_id', pid).order('time_ts', { ascending: false }).limit(1)
      const stepsLast = await supabase.from('steps_event').select('end_ts').eq('patient_id', pid).order('end_ts', { ascending: false }).limit(1)
      const distLast = await supabase.from('distance_event').select('end_ts').eq('patient_id', pid).order('end_ts', { ascending: false }).limit(1)
      const candidates = []
      const hrTs = hrLast && hrLast.data && hrLast.data[0] && hrLast.data[0].time_ts
      const stTs = stepsLast && stepsLast.data && stepsLast.data[0] && stepsLast.data[0].end_ts
      const diTs = distLast && distLast.data && distLast.data[0] && distLast.data[0].end_ts
      if (hrTs) candidates.push(hrTs)
      if (stTs) candidates.push(stTs)
      if (diTs) candidates.push(diTs)
      if (candidates.length) {
        const maxTs = Math.max(...candidates.map((d) => new Date(d).getTime()))
        if (Number.isFinite(maxTs)) lastSyncTs = new Date(maxTs).toISOString()
      }
    } catch (_) { }
  }
  const summary = {
    heartRate: row ? Math.round(row.hr_avg || 0) : null,
    bpSystolic: bpRow ? bpRow.systolic : null,
    bpDiastolic: bpRow ? bpRow.diastolic : null,
    bpPulse: bpRow ? bpRow.pulse : null,
    weightKg: wRow ? wRow.kg_avg : null,
    nextAppointmentDate: null,
    stepsToday: srow ? Math.round(srow.steps_total || 0) : null,
    distanceToday: drow ? Math.round(drow.meters_total || 0) : null,
    lastSyncTs,
  }
  console.log('[patient/summary] summary computed')
  return res.status(200).json({ summary })
})

app.get('/patient/vitals', async (req, res) => {
  try {
    const pid = (req.query && req.query.patientId)
    const period = (req.query && req.query.period) || 'hourly'
    const dateStr = (req.query && req.query.date) || null
    // Use 480 offset for Malaysia Time (UTC+8) default, or from query
    const tzOffsetMin = (req.query && req.query.tzOffsetMin) ? Number(req.query.tzOffsetMin) : 480

    if (!pid) return res.status(400).json({ error: 'missing patientId' })

    let out = { hr: [], spo2: [], steps: [], bp: [], weight: [] }
    if (supabaseMock) {
      return res.status(200).json(out)
    }

    if (period === 'weekly') {
      // Determine week range (Monday to Sunday)
      let start, end
      if (dateStr) {
        const ref = new Date(dateStr)
        // Adjust to Monday
        const day = ref.getDay()
        const diff = ref.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        start = new Date(ref.setDate(diff))
        start.setHours(0, 0, 0, 0)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
      } else {
        // Default to last 7 days ending today? Or current week?
        // User likely wants "current week" context if no date provided, but typically date is provided.
        // Fallback to "last 7 days" approach if no date
        end = new Date()
        start = new Date()
        start.setDate(end.getDate() - 6)
      }
      const startS = start.toISOString().slice(0, 10)
      const endS = end.toISOString().slice(0, 10)

      const hr = await supabase
        .from('hr_day')
        .select('date,hr_min,hr_max,hr_avg')
        .eq('patient_id', pid)
        .gte('date', startS)
        .lte('date', endS)
        .order('date', { ascending: true })
      if (hr.error) return res.status(400).json({ error: hr.error.message })

      const spo2 = await supabase
        .from('spo2_day')
        .select('date,spo2_min,spo2_max,spo2_avg')
        .eq('patient_id', pid)
        .gte('date', startS)
        .lte('date', endS)
        .order('date', { ascending: true })
      if (spo2.error) return res.status(400).json({ error: spo2.error.message })

      const steps = await supabase
        .from('steps_day')
        .select('date,steps_total')
        .eq('patient_id', pid)
        .gte('date', startS)
        .lte('date', endS)
        .order('date', { ascending: true })
      if (steps.error) return res.status(400).json({ error: steps.error.message })

      // Fetch BP readings for the week
      const bp = await supabase
        .from('bp_readings')
        .select('reading_date,reading_time,systolic,diastolic,pulse')
        .eq('patient_id', pid)
        .gte('reading_date', startS)
        .lte('reading_date', endS)
        .order('reading_date', { ascending: true })
        .order('reading_time', { ascending: true })
      if (bp.error) return res.status(400).json({ error: bp.error.message })

      // Fetch weight from weight_sample to ensure fresh data
      const startBuf = new Date(startS); startBuf.setDate(startBuf.getDate() - 1);
      const endBuf = new Date(endS); endBuf.setDate(endBuf.getDate() + 1);

      const weightRaw = await supabase
        .from('weight_sample')
        .select('time_ts,kg')
        .eq('patient_id', pid)
        .gte('time_ts', startBuf.toISOString())
        .lte('time_ts', endBuf.toISOString())
        .order('time_ts', { ascending: true })

      const weightData = []
      if (!weightRaw.error) {
        const wMap = new Map()
        for (const row of (weightRaw.data || [])) {
          const d = new Date(Date.parse(row.time_ts) + (tzOffsetMin * 60000))
          const y = d.getUTCFullYear()
          const m = String(d.getUTCMonth() + 1).padStart(2, '0')
          const day = String(d.getUTCDate()).padStart(2, '0')
          const k = `${y}-${m}-${day}`
          if (k >= startS && k <= endS) {
            if (!wMap.has(k)) wMap.set(k, { sum: 0, count: 0 })
            const e = wMap.get(k)
            e.sum += Number(row.kg)
            e.count++
          }
        }
        for (const [k, v] of wMap) {
          weightData.push({ date: k, kg_avg: Number((v.sum / v.count).toFixed(1)) })
        }
        weightData.sort((a, b) => a.date.localeCompare(b.date))
      }
      const weight = { data: weightData, error: weightRaw.error }

      const hrDays = (hr.data || [])
      // Calculate resting HR from hourly data for the week range
      let restingMap = new Map()
      if (startS && endS) {
        // We need strict UTC timestamps for the hourly query
        // Assuming 'date' in hr_day aligns with local days, we approximate range or use date boundaries
        // Better to use the start/end dates at 00:00/23:59 UTC if possible, or just cover the range
        const startTs = `${startS}T00:00:00.000Z`
        const endTs = `${endS}T23:59:59.999Z`
        const hrs = await supabase
          .from('hr_hour')
          .select('hour_ts,hr_avg,hr_count')
          .eq('patient_id', pid)
          .gte('hour_ts', startTs)
          .lte('hour_ts', endTs)
          .order('hour_ts', { ascending: true })

        if (!hrs.error) {
          const byDay = new Map()
          for (const row of (hrs.data || [])) {
            // Group by local day key based on the row timestamp
            // Since we don't know the exact user timezone offset here (unless we use tzOffsetMin),
            // we'll rely on the date string logic.
            // Ideally we should use tzOffsetMin to group correctly.
            const d = new Date(Date.parse(row.hour_ts) + (tzOffsetMin * 60000)) // shift to local
            const y = d.getUTCFullYear()
            const m = String(d.getUTCMonth() + 1).padStart(2, '0')
            const day = String(d.getUTCDate()).padStart(2, '0')
            const key = `${y}-${m}-${day}`
            const h = d.getUTCHours()
            const arr = byDay.get(key) || []
            arr.push({ h, avg: row.hr_avg, count: row.hr_count })
            byDay.set(key, arr)
          }
          for (const [dk, arr] of byDay) {
            const night = arr.filter(x => x.h >= 0 && x.h <= 6 && (x.count || 0) >= 10).sort((a, b) => a.h - b.h)
            let val
            if (night.length >= 1) {
              let best = { score: Infinity, vals: [] }
              for (let i = 0; i < night.length; i++) {
                const w = [night[i], night[i + 1], night[i + 2]].filter(Boolean)
                if (w.length) {
                  const score = w.reduce((s, x) => s + (x.avg || 0), 0) / w.length
                  const vals = w.map(x => x.avg || 0).sort((a, b) => a - b)
                  const mid = Math.floor(vals.length / 2)
                  const median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2
                  if (score < best.score) best = { score, vals: [median] }
                }
              }
              val = best.vals[0]
            } else {
              const dayAgg = hrDays.find(r => r.date === dk)
              val = dayAgg ? dayAgg.hr_min || null : null
            }
            if (val != null) restingMap.set(dk, Math.round(val))
          }
        }
      }

      out = {
        hr: hrDays.map((r) => ({ time: r.date, min: Math.round(r.hr_min || 0), avg: Math.round(r.hr_avg || 0), max: Math.round(r.hr_max || 0), resting: restingMap.get(r.date) })),
        spo2: (spo2.data || []).map((r) => ({ time: r.date, min: Math.round(r.spo2_min || 0), avg: Math.round(r.spo2_avg || 0), max: Math.round(r.spo2_max || 0) })),
        steps: (steps.data || []).map((r) => ({ time: r.date, count: Math.round(r.steps_total || 0) })),
        bp: (bp.data || []).map((r) => ({
          time: `${r.reading_date}T${r.reading_time}`,
          systolic: r.systolic,
          diastolic: r.diastolic,
          pulse: r.pulse
        })),
        weight: (weight.data || []).map((r) => ({ time: r.date, value: r.kg_avg })),
      }
    } else if (period === 'monthly') {
      let start, end
      if (dateStr) {
        const ref = new Date(dateStr)
        start = new Date(ref.getFullYear(), ref.getMonth(), 1)
        end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
      } else {
        const now = new Date()
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
      const startStr = start.toISOString().slice(0, 10)
      const endStr = end.toISOString().slice(0, 10)
      const hr = await supabase
        .from('hr_day')
        .select('date,hr_min,hr_max,hr_avg')
        .eq('patient_id', pid)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
      if (hr.error) return res.status(400).json({ error: hr.error.message })
      const spo2 = await supabase
        .from('spo2_day')
        .select('date,spo2_min,spo2_max,spo2_avg')
        .eq('patient_id', pid)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
      if (spo2.error) return res.status(400).json({ error: spo2.error.message })
      const steps = await supabase
        .from('steps_day')
        .select('date,steps_total')
        .eq('patient_id', pid)
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
      if (steps.error) return res.status(400).json({ error: steps.error.message })

      // Fetch BP readings for the month
      const bp = await supabase
        .from('bp_readings')
        .select('reading_date,reading_time,systolic,diastolic,pulse')
        .eq('patient_id', pid)
        .gte('reading_date', startStr)
        .lte('reading_date', endStr)
        .order('reading_date', { ascending: true })
        .order('reading_time', { ascending: true })
      if (bp.error) return res.status(400).json({ error: bp.error.message })

      // Fetch weight from weight_sample to ensure fresh data
      const startBuf = new Date(startStr); startBuf.setDate(startBuf.getDate() - 1);
      const endBuf = new Date(endStr); endBuf.setDate(endBuf.getDate() + 1);

      const weightRaw = await supabase
        .from('weight_sample')
        .select('time_ts,kg')
        .eq('patient_id', pid)
        .gte('time_ts', startBuf.toISOString())
        .lte('time_ts', endBuf.toISOString())
        .order('time_ts', { ascending: true })

      const weightData = []
      if (!weightRaw.error) {
        const wMap = new Map()
        for (const row of (weightRaw.data || [])) {
          const d = new Date(Date.parse(row.time_ts) + (tzOffsetMin * 60000))
          const y = d.getUTCFullYear()
          const m = String(d.getUTCMonth() + 1).padStart(2, '0')
          const day = String(d.getUTCDate()).padStart(2, '0')
          const k = `${y}-${m}-${day}`
          if (k >= startStr && k <= endStr) {
            if (!wMap.has(k)) wMap.set(k, { sum: 0, count: 0 })
            const e = wMap.get(k)
            e.sum += Number(row.kg)
            e.count++
          }
        }
        for (const [k, v] of wMap) {
          weightData.push({ date: k, kg_avg: Number((v.sum / v.count).toFixed(1)) })
        }
        weightData.sort((a, b) => a.date.localeCompare(b.date))
      }
      const weight = { data: weightData, error: weightRaw.error }

      const hrDays = (hr.data || [])
      let restingMap = new Map()
      if (startStr && endStr) {
        const startTs = `${startStr}T00:00:00.000Z`
        const endTs = `${endStr}T23:59:59.999Z`
        const hrs = await supabase
          .from('hr_hour')
          .select('hour_ts,hr_avg,hr_count')
          .eq('patient_id', pid)
          .gte('hour_ts', startTs)
          .lte('hour_ts', endTs)
          .order('hour_ts', { ascending: true })
        if (!hrs.error) {
          const byDay = new Map()
          for (const row of (hrs.data || [])) {
            const d = new Date(Date.parse(row.hour_ts) + (tzOffsetMin * 60000))
            const y = d.getUTCFullYear()
            const m = String(d.getUTCMonth() + 1).padStart(2, '0')
            const day = String(d.getUTCDate()).padStart(2, '0')
            const key = `${y}-${m}-${day}`
            const h = d.getUTCHours()
            const arr = byDay.get(key) || []
            arr.push({ h, avg: row.hr_avg, count: row.hr_count })
            byDay.set(key, arr)
          }
          for (const [dk, arr] of byDay) {
            const night = arr.filter(x => x.h >= 0 && x.h <= 6 && (x.count || 0) >= 10).sort((a, b) => a.h - b.h)
            let val
            if (night.length >= 1) {
              let best = { score: Infinity, vals: [] }
              for (let i = 0; i < night.length; i++) {
                const w = [night[i], night[i + 1], night[i + 2]].filter(Boolean)
                if (w.length) {
                  const score = w.reduce((s, x) => s + (x.avg || 0), 0) / w.length
                  const vals = w.map(x => x.avg || 0).sort((a, b) => a - b)
                  const mid = Math.floor(vals.length / 2)
                  const median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2
                  if (score < best.score) best = { score, vals: [median] }
                }
              }
              val = best.vals[0]
            } else {
              const dayAgg = hrDays.find(r => r.date === dk)
              val = dayAgg ? dayAgg.hr_min || null : null
            }
            if (val != null) restingMap.set(dk, Math.round(val))
          }
        }
      }
      out = {
        hr: hrDays.map((r) => ({ time: r.date, min: Math.round(r.hr_min || 0), avg: Math.round(r.hr_avg || 0), max: Math.round(r.hr_max || 0), resting: restingMap.get(r.date) })),
        spo2: (spo2.data || []).map((r) => ({ time: r.date, min: Math.round(r.spo2_min || 0), avg: Math.round(r.spo2_avg || 0), max: Math.round(r.spo2_max || 0) })),
        steps: (steps.data || []).map((r) => ({ time: r.date, count: Math.round(r.steps_total || 0) })),
        bp: (bp.data || []).map((r) => ({
          time: `${r.reading_date}T${r.reading_time}`,
          systolic: r.systolic,
          diastolic: r.diastolic,
          pulse: r.pulse
        })),
        weight: (weight.data || []).map((r) => ({ time: r.date, value: r.kg_avg })),
      }
    } else {
      const date = (req.query && req.query.date) || null
      // const tzOffRaw = (req.query && req.query.tzOffsetMin)
      // const tzOffsetMin = tzOffRaw != null ? Number(tzOffRaw) : 0

      // In supabase-js v2, filters like eq/gte/lte are available on the builder returned by select/update/delete
      let hrQ = supabase
        .from('hr_hour')
        .select('hour_ts,hr_min,hr_max,hr_avg,hr_count')
        .eq('patient_id', pid)
      let spo2Q = supabase
        .from('spo2_hour')
        .select('hour_ts,spo2_min,spo2_max,spo2_avg')
        .eq('patient_id', pid)
      let stepsQ = supabase
        .from('steps_hour')
        .select('hour_ts,steps_total')
        .eq('patient_id', pid)
      let bpQ = supabase
        .from('bp_readings')
        .select('reading_date,reading_time,systolic,diastolic,pulse')
        .eq('patient_id', pid)
      let weightQ = supabase
        .from('weight_day')
        .select('date,kg_avg')
        .eq('patient_id', pid)

      if (date) {
        // DB stores local time as UTC, so we query the date directly
        const start = new Date(`${date}T00:00:00.000Z`)
        const end = new Date(`${date}T23:59:59.999Z`)
        hrQ = hrQ.gte('hour_ts', start.toISOString()).lte('hour_ts', end.toISOString()).order('hour_ts', { ascending: true })
        spo2Q = spo2Q.gte('hour_ts', start.toISOString()).lte('hour_ts', end.toISOString()).order('hour_ts', { ascending: true })
        stepsQ = stepsQ.gte('hour_ts', start.toISOString()).lte('hour_ts', end.toISOString()).order('hour_ts', { ascending: true })
        const dateStr = date // YYYY-MM-DD
        bpQ = bpQ.eq('reading_date', dateStr).order('reading_time', { ascending: true })
        weightQ = weightQ.eq('date', dateStr)
      } else {
        hrQ = hrQ.order('hour_ts', { ascending: false }).limit(24)
        spo2Q = spo2Q.order('hour_ts', { ascending: false }).limit(24)
        stepsQ = stepsQ.order('hour_ts', { ascending: false }).limit(24)
        bpQ = bpQ.order('reading_date', { ascending: false }).order('reading_time', { ascending: false }).limit(24)
        weightQ = weightQ.order('date', { ascending: false }).limit(7)
      }

      const hr = await hrQ
      if (hr.error) return res.status(400).json({ error: hr.error.message })
      const spo2 = await spo2Q
      if (spo2.error) return res.status(400).json({ error: spo2.error.message })
      const steps = await stepsQ
      if (steps.error) return res.status(400).json({ error: steps.error.message })
      const bp = await bpQ
      if (bp.error) return res.status(400).json({ error: bp.error.message })
      const weight = await weightQ

      let hrArr = date ? (hr.data || []) : (hr.data || []).reverse()
      let spo2Arr = date ? (spo2.data || []) : (spo2.data || []).reverse()
      let stepsArr = date ? (steps.data || []) : (steps.data || []).reverse()

      if (date && hrArr.length === 0 && spo2Arr.length === 0 && stepsArr.length === 0) {
        const hr2 = await supabase
          .from('hr_hour')
          .select('hour_ts,hr_min,hr_max,hr_avg,hr_count')
          .eq('patient_id', pid)
          .order('hour_ts', { ascending: false })
          .limit(72)
        const spo22 = await supabase
          .from('spo2_hour')
          .select('hour_ts,spo2_min,spo2_max,spo2_avg')
          .eq('patient_id', pid)
          .order('hour_ts', { ascending: false })
          .limit(72)
        const steps2 = await supabase
          .from('steps_hour')
          .select('hour_ts,steps_total')
          .eq('patient_id', pid)
          .order('hour_ts', { ascending: false })
          .limit(72)
        const toLocalDay = (ts) => {
          const d = new Date(ts)
          const y = d.getUTCFullYear()
          const m = String(d.getUTCMonth() + 1).padStart(2, '0')
          const day = String(d.getUTCDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        }
        hrArr = (hr2.data || []).filter((r) => toLocalDay(r.hour_ts) === date).reverse()
        spo2Arr = (spo22.data || []).filter((r) => toLocalDay(r.hour_ts) === date).reverse()
        stepsArr = (steps2.data || []).filter((r) => toLocalDay(r.hour_ts) === date).reverse()
      }
      const toMalaysiaTime = (ts) => {
        return ts ? ts.replace('Z', '') : ts
      }

      out = {
        hr: hrArr.map((r) => ({ time: toMalaysiaTime(r.hour_ts), min: Math.round((r.hr_min ?? r.hr_avg) || 0), avg: Math.round(r.hr_avg || 0), max: Math.round((r.hr_max ?? r.hr_avg) || 0), count: r.hr_count })),
        spo2: spo2Arr.map((r) => ({ time: toMalaysiaTime(r.hour_ts), min: Math.round((r.spo2_min ?? r.spo2_avg) || 0), avg: Math.round(r.spo2_avg || 0), max: Math.round((r.spo2_max ?? r.spo2_avg) || 0) })),
        steps: stepsArr.map((r) => ({ time: toMalaysiaTime(r.hour_ts), count: Math.round(r.steps_total || 0) })),
        bp: (bp.data || [])
          .map((r) => ({
            time: `${r.reading_date}T${r.reading_time}`,
            systolic: r.systolic,
            diastolic: r.diastolic,
            pulse: r.pulse
          }))
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
        weight: (weight.data || []).map((r) => ({ time: r.date, value: r.kg_avg })),
      }
    }
    console.log('[patient/vitals] response size', {
      hr: out.hr.length, spo2: out.spo2.length, steps: out.steps.length, bp: out.bp.length, weight: out.weight.length
    })
    return res.status(200).json({ vitals: out })
  } catch (err) {
    console.error('[patient/vitals] CRITICAL ERROR:', err)
    return res.status(500).json({ error: 'Internal Server Error', details: err.message })
  }
})

// Patient Reminders
app.get('/patient/reminders', async (req, res) => {
  const pid = req.query && req.query.patientId
  if (!pid) return res.status(400).json({ error: 'missing patientId' })
  const r = await supabase.from('reminders').select('*').eq('patient_id', pid).order('due_ts', { ascending: true })
  if (r.error) return res.status(400).json({ error: r.error.message })
  const reminders = (r.data || []).map((x) => ({
    id: x.id,
    date: x.due_ts,
    title: x.title,
    notes: x.notes
  }))
  return res.status(200).json({ reminders })
})

// Appointments endpoint (aliases reminders for now)
app.get('/appointments', async (req, res) => {
  const pid = req.query && req.query.patientId
  if (!pid) return res.status(400).json({ error: 'missing patientId' })
  const r = await supabase.from('reminders').select('*').eq('patient_id', pid).order('due_ts', { ascending: true })
  if (r.error) return res.status(400).json({ error: r.error.message })
  const appointments = (r.data || []).map((x) => ({
    id: x.id,
    title: x.title,
    date: x.due_ts,
    location: x.notes || 'Online'
  }))
  return res.status(200).json(appointments)
})

app.delete('/appointments/:id', async (req, res) => {
  const id = req.params.id
  const r = await supabase.from('reminders').delete().eq('id', id)
  if (r.error) return res.status(400).json({ error: r.error.message })
  return res.status(200).json({ ok: true })
})

// Medication preferences endpoint
app.get('/patient/medications', async (req, res) => {
  const pid = req.query && req.query.patientId
  if (!pid) return res.status(400).json({ error: 'missing patientId' })

  const r = await supabase.from('medication')
    .select('class')
    .eq('patient_id', pid)
    .eq('active', true)

  if (r.error) return res.status(400).json({ error: r.error.message })

  const classes = new Set((r.data || []).map(m => m.class ? m.class.toLowerCase() : ''))

  const preferences = {
    notify_hour: 9,
    beta_blockers: classes.has('beta blocker') || classes.has('beta-blocker'),
    raas_inhibitors: classes.has('raas inhibitor') || classes.has('ace inhibitor') || classes.has('arb'),
    mras: classes.has('mra') || classes.has('mineralocorticoid receptor antagonist'),
    sglt2_inhibitors: classes.has('sglt2 inhibitor') || classes.has('sglt2'),
    statin: classes.has('statin')
  }

  return res.status(200).json({ preferences })
})

app.post('/patient/reminders', async (req, res) => {
  const { patientId, title, date, notes } = req.body
  if (!patientId || !title || !date) return res.status(400).json({ error: 'missing fields' })
  const raw = {
    patient_id: patientId,
    title,
    type: 'general',
    due_ts: date,
    notes,
    status: 'upcoming'
  }
  const r = await supabase.from('reminders').insert(raw).select()
  if (r.error) return res.status(400).json({ error: r.error.message })
  const row = r.data && r.data[0]
  return res.status(200).json({ reminder: { id: row.id, date: row.due_ts, title: row.title, notes: row.notes } })
})

app.delete('/patient/reminders/:id', async (req, res) => {
  const id = req.params.id
  const pid = req.query.patientId
  if (!id || !pid) return res.status(400).json({ error: 'missing id or patientId' })
  const r = await supabase.from('reminders').delete().eq('id', id).eq('patient_id', pid)
  if (r.error) return res.status(400).json({ error: r.error.message })
  return res.status(200).json({ ok: true, id })
})

app.post('/patient/reminders-edit', async (req, res) => {
  const { patientId, id, title, date, notes } = req.body
  if (!patientId || !id) return res.status(400).json({ error: 'missing id' })
  const updates = {}
  if (title) updates.title = title
  if (date) updates.due_ts = date
  if (notes !== undefined) updates.notes = notes
  updates.updated_at = new Date().toISOString()

  const r = await supabase.from('reminders').update(updates).eq('id', id).eq('patient_id', patientId).select()
  if (r.error) return res.status(400).json({ error: r.error.message })
  const row = r.data && r.data[0]
  return res.status(200).json({ reminder: { id: row.id, date: row.due_ts, title: row.title, notes: row.notes } })
})

app.get('/admin/auth-generate-link', async (req, res) => {
  const email = req.query && req.query.email
  if (!email) return res.status(400).json({ error: 'missing email' })
  const type = (req.query && req.query.type) || 'magiclink'
  const redirect = (req.query && req.query.redirect) || undefined
  const r = await supabase.auth.admin.generateLink({ type, email, redirectTo: redirect })
  if (r.error) return res.status(400).json({ error: r.error.message })
  const data = r.data || {}
  if (!data.action_link && type === 'magiclink') {
    const r2 = await supabase.auth.admin.generateLink({ type: 'recovery', email, redirectTo: redirect })
    const d2 = r2.data || {}
    const frag2 = (d2.action_link || '').split('#')[1]
    const base2 = redirect || 'http://localhost:5173/auth/callback'
    const callback_link2 = frag2 ? `${base2}#${frag2}` : null
    return res.status(200).json({ data: d2, callback_link: callback_link2 })
  }
  const actionLink = (data.action_link || (data.properties && data.properties.action_link) || '')
  const fragment = actionLink.split('#')[1]
  const base = redirect || 'http://localhost:5173/auth/callback'
  const callback_link = fragment ? `${base}#${fragment}` : null
  let verify_link = null
  if (!callback_link && actionLink.includes('redirect_to=')) {
    const u = new URL(actionLink)
    u.searchParams.set('redirect_to', base)
    verify_link = u.toString()
  }
  return res.status(200).json({ data, callback_link, verify_link })
})
app.post('/admin/create-user', async (req, res) => {
  const email = req.body && req.body.email
  const password = req.body && req.body.password
  const role = (req.body && req.body.role) || 'patient'
  if (!email || !password) return res.status(400).json({ error: 'missing email or password' })
  const r = await supabase.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role } })
  if (r.error) return res.status(400).json({ error: r.error.message })
  const user = r.data && r.data.user
  if (role === 'patient' && user && user.id) {
    await ensurePatient(user.id)
  }
  return res.status(200).json({ user: { id: user.id, email: user.email }, role })
})
app.post('/admin/promote', async (req, res) => {
  const email = req.body && req.body.email
  const role = (req.body && req.body.role) || 'admin'
  if (!email) return res.status(400).json({ error: 'missing email' })
  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (list.error) return res.status(400).json({ error: list.error.message })
  const users = (list.data && list.data.users) || []
  const u = users.find((x) => x.email === email)
  if (!u) return res.status(404).json({ error: 'user not found' })
  const upd = await supabase.auth.admin.updateUserById(u.id, { app_metadata: { role } })
  if (upd.error) return res.status(400).json({ error: upd.error.message })
  return res.status(200).json({ ok: true, id: u.id, email: u.email, role })
})

async function deletePatientCascade(pid) {
  const out = {}
  const tables = [
    'steps_event', 'steps_hour', 'steps_day',
    'hr_sample', 'hr_hour', 'hr_day',
    'spo2_sample', 'spo2_hour', 'spo2_day',
    'devices'
  ]
  for (const t of tables) {
    const del = await supabase.from(t).delete().eq('patient_id', pid)
    out[t] = { count: (del.data || []).length, error: del.error ? del.error.message : null }
  }
  const delp = await supabase.from('patients').delete().eq('patient_id', pid)
  out.patients_delete = { count: (delp.data || []).length, error: delp.error ? delp.error.message : null }
  return out
}

app.post('/admin/delete-user', async (req, res) => {
  const id = req.body && req.body.id
  const email = req.body && req.body.email
  const cascade = !!(req.body && req.body.cascade)
  if (!id && !email) return res.status(400).json({ error: 'missing id or email' })
  let uid = id
  if (!uid && email) {
    const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (list.error) return res.status(400).json({ error: list.error.message })
    const users = (list.data && list.data.users) || []
    const u = users.find((x) => x.email === email)
    if (!u) return res.status(404).json({ error: 'user not found' })
    uid = u.id
  }
  const del = await supabase.auth.admin.deleteUser(uid)
  if (del.error) return res.status(400).json({ error: del.error.message })
  let cascade_result = null
  if (cascade) {
    cascade_result = await deletePatientCascade(uid)
  }
  return res.status(200).json({ ok: true, id: uid, cascade: cascade_result })
})

app.post('/admin/ban-user', async (req, res) => {
  const id = req.body && req.body.id
  const email = req.body && req.body.email
  const duration = (req.body && req.body.duration) || 'forever'
  if (!id && !email) return res.status(400).json({ error: 'missing id or email' })
  let uid = id
  if (!uid && email) {
    const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (list.error) return res.status(400).json({ error: list.error.message })
    const users = (list.data && list.data.users) || []
    const u = users.find((x) => x.email === email)
    if (!u) return res.status(404).json({ error: 'user not found' })
    uid = u.id
  }
  const upd = await supabase.auth.admin.updateUserById(uid, { ban_duration: duration, app_metadata: { deleted: true } })
  if (upd.error) return res.status(400).json({ error: upd.error.message })
  return res.status(200).json({ ok: true, id: uid, ban_duration: duration })
})

app.post('/admin/anonymize-user', async (req, res) => {
  const id = req.body && req.body.id
  const email = req.body && req.body.email
  if (!id && !email) return res.status(400).json({ error: 'missing id or email' })
  let uid = id
  let currentEmail = email
  if (!uid || !currentEmail) {
    const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (list.error) return res.status(400).json({ error: list.error.message })
    const users = (list.data && list.data.users) || []
    const u = uid ? users.find((x) => x.id === uid) : users.find((x) => x.email === email)
    if (!u) return res.status(404).json({ error: 'user not found' })
    uid = u.id
    currentEmail = u.email
  }
  const ts = Date.now()
  const anonym = `deleted+${uid}+${ts}@example.invalid`
  const upd = await supabase.auth.admin.updateUserById(uid, { email: anonym, app_metadata: { deleted: true, role: null } })
  if (upd.error) return res.status(400).json({ error: upd.error.message })
  return res.status(200).json({ ok: true, id: uid, old_email: currentEmail, new_email: anonym })
})

app.post('/admin/delete-patient', async (req, res) => {
  const pid = req.body && req.body.patientId
  if (!pid) return res.status(400).json({ error: 'missing patientId' })
  const result = await deletePatientCascade(pid)
  return res.status(200).json({ ok: true, patientId: pid, result })
})

app.post('/admin/update-email', async (req, res) => {
  const id = req.body && req.body.id
  const email = req.body && req.body.email
  if (!id || !email) return res.status(400).json({ error: 'missing id or email' })
  const upd = await supabase.auth.admin.updateUserById(id, { email, email_confirm: true })
  if (upd.error) return res.status(400).json({ error: upd.error.message })
  return res.status(200).json({ ok: true, id, email })
})
app.post('/ingest/steps-events', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body]
  // console.log('POST /ingest/steps-events', { count: items.length })
  if (!items.length) return res.status(200).json({ inserted: 0, upserted_hour: 0, upserted_day: 0 })
  const patientId = items[0].patientId
  const vp = await validatePatientId(patientId)
  if (!vp.ok) return res.status(400).json({ error: `invalid patient: ${vp.error}` })
  const origins = [...new Set(items.map((i) => i.originId).filter(Boolean))]
  const devices = [...new Set(items.map((i) => i.deviceId).filter(Boolean))]
  const info = { firstName: items[0] && items[0].firstName, lastName: items[0] && items[0].lastName, dateOfBirth: items[0] && items[0].dateOfBirth }
  const ep = await ensurePatient(patientId, info)
  if (!ep.ok) return res.status(400).json({ error: `patient upsert failed: ${ep.error}` })
  const eo = await ensureOrigins(origins)
  if (!eo.ok) return res.status(400).json({ error: `origin upsert failed: ${eo.error}` })
  const ed = await ensureDevices(devices, patientId)
  if (!ed.ok) return res.status(400).json({ error: `device upsert failed: ${ed.error}` })
  const raw = items.map((i) => ({
    patient_id: i.patientId,
    origin_id: i.originId,
    device_id: i.deviceId,
    start_ts: i.startTs,
    end_ts: i.endTs,
    count: i.count,
    record_uid: i.recordUid,
  }))
  const ins = await supabase.from('steps_event').upsert(raw, { onConflict: 'record_uid', ignoreDuplicates: true })
  if (ins.error) {
    console.error('steps_event upsert error', ins.error)
    return res.status(400).json({ error: ins.error.message })
  }
  const byHour = new Map()
  const byDay = new Map()
  for (const i of items) {
    const offset = i.tzOffsetMin || 480
    const h = toHourWithOffset(i.endTs, offset)
    const d = toDateWithOffset(i.endTs, offset)
    const hk = `${i.patientId}|${h}`
    const dk = `${i.patientId}|${d}`
    byHour.set(hk, (byHour.get(hk) || 0) + (i.count || 0))
    byDay.set(dk, (byDay.get(dk) || 0) + (i.count || 0))
  }
  const hourRows = []
  for (const [k, v] of byHour) {
    const [pid, h] = k.split('|')
    hourRows.push({ patient_id: pid, hour_ts: h, steps_total: v })
  }
  const dayRows = []
  for (const [k, v] of byDay) {
    const [pid, d] = k.split('|')
    dayRows.push({ patient_id: pid, date: d, steps_total: v })
  }
  const uph = await supabase.from('steps_hour').upsert(hourRows, { onConflict: 'patient_id,hour_ts' })
  if (uph.error) {
    console.error('steps_hour upsert error', uph.error)
    return res.status(400).json({ error: uph.error.message })
  }
  const upd = await supabase.from('steps_day').upsert(dayRows, { onConflict: 'patient_id,date' })
  if (upd.error) {
    console.error('steps_day upsert error', upd.error)
    return res.status(400).json({ error: upd.error.message })
  }
  try {
    const maxEnd = items.reduce((m, i) => (!m || (new Date(i.endTs).getTime() > new Date(m).getTime())) ? i.endTs : m, null)
    const dev = devices && devices.length ? devices[0] : 'unknown'
    if (maxEnd) {
      await supabase.from('device_sync_status').upsert({ patient_id: patientId, device_id: dev, last_sync_ts: maxEnd }, { onConflict: 'patient_id,device_id' })
    }
  } catch (_) { }
  return res.status(200).json({ inserted: (ins.data || []).length, upserted_hour: hourRows.length, upserted_day: dayRows.length })
})
app.post('/ingest/distance-events', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body]
  if (!items.length) return res.status(200).json({ inserted: 0, upserted_hour: 0, upserted_day: 0 })
  const patientId = items[0].patientId
  const vp = await validatePatientId(patientId)
  if (!vp.ok) return res.status(400).json({ error: `invalid patient: ${vp.error}` })
  const origins = [...new Set(items.map((i) => i.originId).filter(Boolean))]
  const devices = [...new Set(items.map((i) => i.deviceId).filter(Boolean))]
  const info = { firstName: items[0] && items[0].firstName, lastName: items[0] && items[0].lastName, dateOfBirth: items[0] && items[0].dateOfBirth }
  const ep = await ensurePatient(patientId, info)
  if (!ep.ok) return res.status(400).json({ error: `patient upsert failed: ${ep.error}` })
  const eo = await ensureOrigins(origins)
  if (!eo.ok) return res.status(400).json({ error: `origin upsert failed: ${eo.error}` })
  const ed = await ensureDevices(devices, patientId)
  if (!ed.ok) return res.status(400).json({ error: `device upsert failed: ${ed.error}` })
  const raw = items.map((i) => ({
    patient_id: i.patientId,
    origin_id: i.originId,
    device_id: i.deviceId,
    start_ts: i.startTs,
    end_ts: i.endTs,
    meters: i.meters,
    record_uid: i.recordUid,
  }))
  const ins = await supabase.from('distance_event').upsert(raw, { onConflict: 'record_uid', ignoreDuplicates: true })
  if (ins.error) return res.status(400).json({ error: ins.error.message })
  const byHour = new Map()
  const byDay = new Map()
  for (const i of items) {
    const offset = i.tzOffsetMin || 480
    const h = toHourWithOffset(i.endTs, offset)
    const d = toDateWithOffset(i.endTs, offset)
    const hk = `${i.patientId}|${h}`
    const dk = `${i.patientId}|${d}`
    byHour.set(hk, (byHour.get(hk) || 0) + (i.meters || 0))
    byDay.set(dk, (byDay.get(dk) || 0) + (i.meters || 0))
  }
  const hourRows = []
  for (const [k, v] of byHour) {
    const [pid, h] = k.split('|')
    hourRows.push({ patient_id: pid, hour_ts: h, meters_total: v })
  }
  const dayRows = []
  for (const [k, v] of byDay) {
    const [pid, d] = k.split('|')
    dayRows.push({ patient_id: pid, date: d, meters_total: v })
  }
  const uph = await supabase.from('distance_hour').upsert(hourRows, { onConflict: 'patient_id,hour_ts' })
  if (uph.error) return res.status(400).json({ error: uph.error.message })
  const upd = await supabase.from('distance_day').upsert(dayRows, { onConflict: 'patient_id,date' })
  if (upd.error) return res.status(400).json({ error: upd.error.message })
  try {
    const maxEnd = items.reduce((m, i) => (!m || (new Date(i.endTs).getTime() > new Date(m).getTime())) ? i.endTs : m, null)
    const dev = devices && devices.length ? devices[0] : 'unknown'
    if (maxEnd) {
      await supabase.from('device_sync_status').upsert({ patient_id: patientId, device_id: dev, last_sync_ts: maxEnd }, { onConflict: 'patient_id,device_id' })
    }
  } catch (_) { }
  return res.status(200).json({ inserted: (ins.data || []).length, upserted_hour: hourRows.length, upserted_day: dayRows.length })
})
app.post('/ingest/hr-samples', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body]
  // console.log('POST /ingest/hr-samples', { count: items.length })
  if (!items.length) return res.status(200).json({ inserted: 0, upserted_hour: 0, upserted_day: 0 })
  const patientId = items[0].patientId
  const vp = await validatePatientId(patientId)
  if (!vp.ok) return res.status(400).json({ error: `invalid patient: ${vp.error}` })
  const origins = [...new Set(items.map((i) => i.originId).filter(Boolean))]
  const devices = [...new Set(items.map((i) => i.deviceId).filter(Boolean))]
  const info = { firstName: items[0] && items[0].firstName, lastName: items[0] && items[0].lastName, dateOfBirth: items[0] && items[0].dateOfBirth }
  const ep = await ensurePatient(patientId, info)
  if (!ep.ok) return res.status(400).json({ error: `patient upsert failed: ${ep.error}` })
  const eo = await ensureOrigins(origins)
  if (!eo.ok) return res.status(400).json({ error: `origin upsert failed: ${eo.error}` })
  const ed = await ensureDevices(devices, patientId)
  if (!ed.ok) return res.status(400).json({ error: `device upsert failed: ${ed.error}` })
  const raw = items.map((i) => ({
    patient_id: i.patientId,
    origin_id: i.originId,
    device_id: i.deviceId,
    time_ts: i.timeTs,
    bpm: i.bpm,
    record_uid: i.recordUid,
  }))
  const ins = await supabase.from('hr_sample').upsert(raw, { onConflict: 'record_uid', ignoreDuplicates: true })
  if (ins.error) {
    console.error('hr_sample upsert error', ins.error)
    return res.status(400).json({ error: ins.error.message })
  }
  const hourAgg = new Map()
  const dayAgg = new Map()
  for (const i of items) {
    const offset = i.tzOffsetMin || 480
    const h = toHourWithOffset(i.timeTs, offset)
    const d = toDateWithOffset(i.timeTs, offset)
    const hk = `${i.patientId}|${h}`
    const dk = `${i.patientId}|${d}`
    const ha = hourAgg.get(hk) || { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY, sum: 0, count: 0 }
    ha.min = Math.min(ha.min, i.bpm)
    ha.max = Math.max(ha.max, i.bpm)
    ha.sum += i.bpm
    ha.count += 1
    hourAgg.set(hk, ha)
    const da = dayAgg.get(dk) || { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY, sum: 0, count: 0 }
    da.min = Math.min(da.min, i.bpm)
    da.max = Math.max(da.max, i.bpm)
    da.sum += i.bpm
    da.count += 1
    dayAgg.set(dk, da)
  }
  const hourRows = []
  for (const [k, a] of hourAgg) {
    const [pid, h] = k.split('|')
    const avg = a.count ? a.sum / a.count : 0
    hourRows.push({ patient_id: pid, hour_ts: h, hr_min: Math.round(a.min), hr_max: Math.round(a.max), hr_avg: avg, hr_count: a.count })
  }
  const dayRows = []
  for (const [k, a] of dayAgg) {
    const [pid, d] = k.split('|')
    const avg = a.count ? a.sum / a.count : 0
    dayRows.push({ patient_id: pid, date: d, hr_min: Math.round(a.min), hr_max: Math.round(a.max), hr_avg: avg, hr_count: a.count })
  }
  const uph = await supabase.from('hr_hour').upsert(hourRows, { onConflict: 'patient_id,hour_ts' })
  if (uph.error) {
    console.error('hr_hour upsert error', uph.error)
    return res.status(400).json({ error: uph.error.message })
  }
  const upd = await supabase.from('hr_day').upsert(dayRows, { onConflict: 'patient_id,date' })
  if (upd.error) {
    console.error('hr_day upsert error', upd.error)
    return res.status(400).json({ error: upd.error.message })
  }
  return res.status(200).json({ inserted: (ins.data || []).length, upserted_hour: hourRows.length, upserted_day: dayRows.length })
})
app.post('/ingest/spo2-samples', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body]
  // console.log('POST /ingest/spo2-samples', { count: items.length })
  if (!items.length) return res.status(200).json({ inserted: 0, upserted_hour: 0, upserted_day: 0 })
  const patientId = items[0].patientId
  const vp = await validatePatientId(patientId)
  if (!vp.ok) return res.status(400).json({ error: `invalid patient: ${vp.error}` })
  const origins = [...new Set(items.map((i) => i.originId).filter(Boolean))]
  const devices = [...new Set(items.map((i) => i.deviceId).filter(Boolean))]
  const info = { firstName: items[0] && items[0].firstName, lastName: items[0] && items[0].lastName, dateOfBirth: items[0] && items[0].dateOfBirth }
  const ep = await ensurePatient(patientId, info)
  if (!ep.ok) return res.status(400).json({ error: `patient upsert failed: ${ep.error}` })
  const eo = await ensureOrigins(origins)
  if (!eo.ok) return res.status(400).json({ error: `origin upsert failed: ${eo.error}` })
  const ed = await ensureDevices(devices, patientId)
  if (!ed.ok) return res.status(400).json({ error: `device upsert failed: ${ed.error}` })
  const raw = items.map((i) => ({
    patient_id: i.patientId,
    origin_id: i.originId,
    device_id: i.deviceId,
    time_ts: i.timeTs,
    spo2_pct: i.spo2Pct,
    record_uid: i.recordUid,
  }))
  const ins = await supabase.from('spo2_sample').upsert(raw, { onConflict: 'record_uid', ignoreDuplicates: true })
  if (ins.error) {
    console.error('spo2_sample upsert error', ins.error)
    return res.status(400).json({ error: ins.error.message })
  }
  const hourAgg = new Map()
  const dayAgg = new Map()
  for (const i of items) {
    const offset = i.tzOffsetMin || 480
    const h = toHourWithOffset(i.timeTs, offset)
    const d = toDateWithOffset(i.timeTs, offset)
    const hk = `${i.patientId}|${h}`
    const dk = `${i.patientId}|${d}`
    const ha = hourAgg.get(hk) || { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY, sum: 0, count: 0 }
    ha.min = Math.min(ha.min, i.spo2Pct)
    ha.max = Math.max(ha.max, i.spo2Pct)
    ha.sum += i.spo2Pct
    ha.count += 1
    hourAgg.set(hk, ha)
    const da = dayAgg.get(dk) || { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY, sum: 0, count: 0 }
    da.min = Math.min(da.min, i.spo2Pct)
    da.max = Math.max(da.max, i.spo2Pct)
    da.sum += i.spo2Pct
    da.count += 1
    dayAgg.set(dk, da)
  }
  const hourRows = []
  for (const [k, a] of hourAgg) {
    const [pid, h] = k.split('|')
    const avg = a.count ? a.sum / a.count : 0
    hourRows.push({ patient_id: pid, hour_ts: h, spo2_min: a.min, spo2_max: a.max, spo2_avg: avg, spo2_count: a.count })
  }
  const dayRows = []
  for (const [k, a] of dayAgg) {
    const [pid, d] = k.split('|')
    const avg = a.count ? a.sum / a.count : 0
    dayRows.push({ patient_id: pid, date: d, spo2_min: a.min, spo2_max: a.max, spo2_avg: avg, spo2_count: a.count })
  }
  const uph = await supabase.from('spo2_hour').upsert(hourRows, { onConflict: 'patient_id,hour_ts' })
  if (uph.error) {
    console.error('spo2_hour upsert error', uph.error)
    return res.status(400).json({ error: uph.error.message })
  }
  const upd = await supabase.from('spo2_day').upsert(dayRows, { onConflict: 'patient_id,date' })
  if (upd.error) {
    console.error('spo2_day upsert error', upd.error)
    return res.status(400).json({ error: upd.error.message })
  }
  return res.status(200).json({ inserted: (ins.data || []).length, upserted_hour: hourRows.length, upserted_day: dayRows.length })
})

// Ingest weight samples (manual/self-check)
app.post('/ingest/weight-samples', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body]
  if (!items.length) return res.status(200).json({ inserted: 0, upserted_day: 0 })
  const patientId = items[0].patientId
  const vp = await validatePatientId(patientId)
  if (!vp.ok) return res.status(400).json({ error: `invalid patient: ${vp.error}` })

  const origins = [...new Set(items.map((i) => i.originId).filter(Boolean))]
  const devices = [...new Set(items.map((i) => i.deviceId).filter(Boolean))]
  const info = { firstName: items[0] && items[0].firstName, lastName: items[0] && items[0].lastName, dateOfBirth: items[0] && items[0].dateOfBirth }
  const ep = await ensurePatient(patientId, info)
  if (!ep.ok) return res.status(400).json({ error: `patient upsert failed: ${ep.error}` })
  const eo = await ensureOrigins(origins)
  if (!eo.ok) return res.status(400).json({ error: `origin upsert failed: ${eo.error}` })
  const ed = await ensureDevices(devices, patientId)
  if (!ed.ok) return res.status(400).json({ error: `device upsert failed: ${ed.error}` })

  const raw = items.map((i) => ({
    patient_id: i.patientId,
    origin_id: i.originId || 'manual',
    device_id: i.deviceId || 'selfcheck',
    time_ts: i.timeTs,
    kg: i.kg,
    record_uid: i.recordUid,
  }))
  const ins = await supabase.from('weight_sample').upsert(raw, { onConflict: 'record_uid', ignoreDuplicates: true })
  if (ins.error) {
    console.error('weight_sample upsert error', ins.error)
    return res.status(400).json({ error: ins.error.message })
  }

  const dayAgg = new Map()
  for (const i of items) {
    const offset = i.tzOffsetMin || 480
    const d = toDateWithOffset(i.timeTs, offset)
    const dk = `${i.patientId}|${d}`
    const da = dayAgg.get(dk) || { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY, sum: 0, count: 0 }
    da.min = Math.min(da.min, i.kg)
    da.max = Math.max(da.max, i.kg)
    da.sum += i.kg
    da.count += 1
    dayAgg.set(dk, da)
  }
  const dayRows = []
  for (const [k, a] of dayAgg) {
    const [pid, d] = k.split('|')
    const avg = a.count ? Math.round((a.sum / a.count) * 10) / 10 : 0
    dayRows.push({ patient_id: pid, date: d, kg_min: a.min, kg_max: a.max, kg_avg: avg })
  }

  // Use try/catch for weight_day to avoid blocking sample ingest
  try {
    const upd = await supabase.from('weight_day').upsert(dayRows, { onConflict: 'patient_id,date' })
    if (upd.error) console.error('weight_day upsert error (non-fatal)', upd.error)
  } catch (e) {
    console.error('weight_day upsert exception', e)
  }

  return res.status(200).json({ inserted: (ins.data || []).length, upserted_day: dayRows.length })
})

// Ingest symptom log (manual/self-check)
app.post('/ingest/symptom-log', async (req, res) => {
  const i = req.body || {}
  if (!i || !i.patientId) return res.status(400).json({ error: 'missing patientId' })
  const vp = await validatePatientId(i.patientId)
  if (!vp.ok) return res.status(400).json({ error: `invalid patient: ${vp.error}` })

  const info = { firstName: i.firstName, lastName: i.lastName, dateOfBirth: i.dateOfBirth }
  const ep = await ensurePatient(i.patientId, info)
  if (!ep.ok) return res.status(400).json({ error: `patient upsert failed: ${ep.error}` })

  const offset = i.tzOffsetMin || 480
  const dateStr = toDateWithOffset(i.timeTs || new Date().toISOString(), offset)
  const raw = {
    patient_id: i.patientId,
    logged_at: i.timeTs || new Date().toISOString(),
    date: dateStr,
    cough: i.cough ?? 0,
    sob_activity: i.breathlessness ?? 0,
    leg_swelling: i.swelling ?? 0,
    sudden_weight_gain: i.weightGain ?? 0,
    abd_discomfort: i.abdomen ?? 0,
    orthopnea: i.sleeping ?? 0,
    notes: i.notes || '',
    origin_id: i.originId || 'manual',
    record_uid: i.recordUid,
  }
  const ins = await supabase.from('symptom_log').insert(raw)
  if (ins.error) {
    console.error('symptom_log insert error', ins.error)
    return res.status(400).json({ error: ins.error.message })
  }
  return res.status(200).json({ inserted: 1 })
})

app.get('/debug-db', async (req, res) => {
  const pid = req.query.patientId
  if (!pid) return res.json({ error: 'missing patientId' })
  const hr = await supabase.from('hr_hour').select('*').eq('patient_id', pid).order('hour_ts', { ascending: false }).limit(20)
  const steps = await supabase.from('steps_hour').select('*').eq('patient_id', pid).order('hour_ts', { ascending: false }).limit(20)
  return res.json({ hr: hr.data, steps: steps.data })
})

const port = process.env.PORT || 3001
const server = app.listen(port, '0.0.0.0', () => process.stdout.write(`server:${port}\n`))

// Keep alive
setInterval(() => {
  console.log('[server] heartbeat - ' + new Date().toISOString())
}, 10000)

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught:', err)
})

app.post("/water-salt", async (req, res) => {
  const { patient_id, water_intake, salt_intake, date } = req.body

  try {
    const payload = {
      patient_id,
      water_intake,
      salt_intake,
      date: date || new Date().toISOString(),
    }

    const { error } = await supabase.from("water_salt_logs").insert([payload])
    if (error) throw error

    res.json({ success: true, log: payload })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/water-salt", async (req, res) => {
  const patientId = req.query.patientId
  const limit = Number(req.query.limit || 14)

  if (!patientId) return res.status(400).json({ error: 'missing patientId' })

  try {
    const { data, error } = await supabase
      .from("water_salt_logs")
      .select("id, patient_id, water_intake, salt_intake, date")
      .eq("patient_id", patientId)
      .order("date", { ascending: false })
      .limit(limit)

    if (error) throw error

    res.json({ logs: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/ocr/weight", processWeightImage(supabase, uploadMiddleware))
