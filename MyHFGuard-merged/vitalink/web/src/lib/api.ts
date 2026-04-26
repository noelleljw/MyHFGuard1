const DEFAULT_URL = 'http://localhost:3001'

export function serverUrl() {
  const fromEnv1 = import.meta.env.VITE_SERVER_URL as string | undefined
  const fromEnv2 = import.meta.env.VITE_API_URL as string | undefined
  return (fromEnv1 && fromEnv1.length > 0) ? fromEnv1 : ((fromEnv2 && fromEnv2.length > 0) ? fromEnv2 : DEFAULT_URL)
}

// Separate URL for BP image processing backend only - NOW MERGED WITH MAIN SERVER
export function bpServerUrl() {
  return serverUrl()
}

export async function getAdminSummary() {
  const res = await fetch(serverUrl() + '/admin/summary')
  if (!res.ok) throw new Error('failed to fetch summary: ' + res.status)
  return res.json() as Promise<{ summary: Array<{ patientId: string, steps: any, hr: any, spo2: any }> }>
}

export type PatientSummary = {
  heartRate?: number
  bpSystolic?: number
  bpDiastolic?: number
  bpPulse?: number
  weightKg?: number
  nextAppointmentDate?: string
  stepsToday?: number
  distanceToday?: number
  lastSyncTs?: string
}

// removed implicit session-based patient id; caller must provide patientId explicitly

export async function getPatientSummary(patientId?: string) {
  const pid = patientId
  const url = pid ? `${serverUrl()}/patient/summary?patientId=${encodeURIComponent(pid)}` : `${serverUrl()}/patient/summary`
  const res = await fetch(url)
  if (!res.ok) return { summary: {} as PatientSummary }
  return res.json() as Promise<{ summary: PatientSummary }>
}

export type PatientVitals = {
  hr?: Array<{ time: string; min: number; avg: number; max: number }>
  spo2?: Array<{ time: string; min: number; avg: number; max: number }>
  steps?: Array<{ time: string; count: number }>
  bp?: Array<{ time: string; systolic: number; diastolic: number; pulse: number }>
  weight?: Array<{ time: string; kg: number }>
}

export async function getPatientVitals(patientId?: string, period?: "hourly" | "weekly" | "monthly", date?: string, tzOffsetMin?: number) {
  const pid = patientId
  const qp = [] as string[]
  if (pid) qp.push(`patientId=${encodeURIComponent(pid)}`)
  if (period) qp.push(`period=${encodeURIComponent(period)}`)
  if (date) qp.push(`date=${encodeURIComponent(date)}`)
  if (typeof tzOffsetMin === "number") qp.push(`tzOffsetMin=${encodeURIComponent(String(tzOffsetMin))}`)
  const url = qp.length ? `${serverUrl()}/patient/vitals?${qp.join("&")}` : `${serverUrl()}/patient/vitals`
  const res = await fetch(url)
  if (!res.ok) return { vitals: {} as PatientVitals }
  const data = await res.json()
  return { vitals: (data.vitals || data) as PatientVitals }
}

export type PatientReminders = Array<{ id: string; date: string; title: string; notes?: string }>

export async function getPatientReminders(patientId?: string) {
  const pid = patientId
  const url = pid ? `${serverUrl()}/patient/reminders?patientId=${encodeURIComponent(pid)}` : `${serverUrl()}/patient/reminders`
  const res = await fetch(url)
  if (!res.ok) return { reminders: [] as PatientReminders }
  return res.json() as Promise<{ reminders: PatientReminders }>
}

export async function processImage(file: File, patientId: string) {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('patientId', patientId)

  // Use serverUrl() instead of bpServerUrl() logic
  const res = await fetch(`${serverUrl()}/api/process-image`, { method: 'POST', body: formData })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to process image')
  }
  return res.json()
}

export async function addManualEvent(data: any, patientId: string) {
  // Use serverUrl() instead of bpServerUrl() logic
  const res = await fetch(`${serverUrl()}/api/add-manual-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, patientId }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to add event')
  }
  return res.json()
}

export async function getHealthEvents(userId?: string) {
  // Use serverUrl() instead of bpServerUrl() logic
  const url = userId ? `${serverUrl()}/api/health-events?user_id=${encodeURIComponent(userId)}` : `${serverUrl()}/api/health-events`
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch events')
  }
  return res.json()
}

export type PatientProfile = {
  patient_id: string
  first_name: string
  last_name: string
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
  date_of_birth?: string
}

export async function getPatients() {
  // Use serverUrl() instead of bpServerUrl() logic
  const res = await fetch(`${serverUrl()}/api/admin/patients`)
  if (!res.ok) throw new Error('Failed to fetch patients')
  return res.json() as Promise<{ patients: PatientProfile[] }>
}

export async function getPatientProfile(patientId: string) {
  // Use serverUrl() instead of bpServerUrl() logic
  const res = await fetch(`${serverUrl()}/api/admin/patients?patientId=${encodeURIComponent(patientId)}`)
  if (!res.ok) throw new Error('Failed to fetch patient profile')
  const data = await res.json()
  return data.patients[0] as PatientProfile | undefined
}

export async function createPatientReminder(payload: { patientId: string; title: string; date: string; notes?: string; tzOffsetMin?: number }) {
  const res = await fetch(`${serverUrl()}/patient/reminders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const body = await res.json()
  if (!res.ok) return body
  return body as { reminder: { id: string; date: string; title: string; notes?: string } }
}

export async function deletePatientReminder(patientId: string, id: string) {
  const url = `${serverUrl()}/patient/reminders/${encodeURIComponent(id)}?patientId=${encodeURIComponent(patientId)}`
  const res = await fetch(url, { method: 'DELETE' })
  return res.json() as Promise<{ ok: boolean; id: string }>
}

export async function updatePatientReminder(payload: { patientId: string; id: string; title?: string; date?: string; notes?: string; tzOffsetMin?: number }) {
  const url = `${serverUrl()}/patient/reminders-edit`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const body = await res.json()
  if (!res.ok) return body
  return body as { reminder: { id: string; date: string; title: string; notes?: string } }
}

export type MedicationPreferences = {
  beta_blockers: boolean
  raas_inhibitors: boolean
  mras: boolean
  sglt2_inhibitors: boolean
  statin: boolean
  notify_hour: number
}

export async function getPatientMedications(patientId?: string) {
  const pid = patientId
  const url = pid ? `${serverUrl()}/patient/medications?patientId=${encodeURIComponent(pid)}` : `${serverUrl()}/patient/medications`
  const res = await fetch(url)
  if (!res.ok) return { preferences: { beta_blockers: false, raas_inhibitors: false, mras: false, sglt2_inhibitors: false, statin: false, notify_hour: 9 } as MedicationPreferences }
  return res.json() as Promise<{ preferences: MedicationPreferences }>
}

export async function savePatientMedications(payload: { patientId: string } & Partial<MedicationPreferences>) {
  const res = await fetch(`${serverUrl()}/patient/medications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  return res.json() as Promise<{ ok: boolean }>
}

export type PatientInfo = { patient?: { patient_id: string; first_name?: string; last_name?: string; dob?: string }, devicesCount?: number, devices?: any[], warnings?: string[] }

export async function getPatientInfo(patientId?: string) {
  const pid = patientId
  const url = pid ? `${serverUrl()}/admin/patient-info?patientId=${encodeURIComponent(pid)}` : `${serverUrl()}/admin/patient-info`
  const res = await fetch(url)
  if (!res.ok) return { patient: undefined, devicesCount: 0, warnings: [] } as PatientInfo
  return res.json() as Promise<PatientInfo>
}

export async function postWeightSample(payload: { patientId: string; kg: number; timeTs?: string; originId?: string; deviceId?: string; tzOffsetMin?: number }) {
  const body = Array.isArray(payload) ? payload : [{
    patientId: payload.patientId,
    kg: payload.kg,
    timeTs: payload.timeTs || new Date().toISOString(),
    originId: payload.originId || 'manual',
    deviceId: payload.deviceId || 'selfcheck',
    tzOffsetMin: payload.tzOffsetMin ?? (0 - new Date().getTimezoneOffset()),
    recordUid: `${payload.patientId}|${Date.now()}|${Math.random().toString(36).slice(2)}`,
  }]
  const res = await fetch(`${serverUrl()}/ingest/weight-samples`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}

export async function postSymptomLog(payload: { patientId: string; timeTs?: string; cough?: number; breathlessness?: number; swelling?: number; weightGain?: number; abdomen?: number; sleeping?: number; notes?: string; tzOffsetMin?: number }) {
  const body = {
    patientId: payload.patientId,
    timeTs: payload.timeTs || new Date().toISOString(),
    cough: payload.cough ?? 0,
    breathlessness: payload.breathlessness ?? 0,
    swelling: payload.swelling ?? 0,
    weightGain: payload.weightGain ?? 0,
    abdomen: payload.abdomen ?? 0,
    sleeping: payload.sleeping ?? 0,
    notes: payload.notes || '',
    tzOffsetMin: payload.tzOffsetMin ?? (0 - new Date().getTimezoneOffset()),
    originId: 'manual',
    recordUid: `${payload.patientId}|${Date.now()}|${Math.random().toString(36).slice(2)}`,
  }
  console.log('[postSymptomLog] body', body)
  const res = await fetch(`${serverUrl()}/ingest/symptom-log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return res.json()
}

export async function getDailyStatus(patientId: string, date: string) {
  const res = await fetch(`${serverUrl()}/patient/daily-status?patientId=${encodeURIComponent(patientId)}&date=${encodeURIComponent(date)}`)
  if (!res.ok) return { has_weight: false, has_bp: false, has_symptoms: false }
  return res.json() as Promise<{ has_weight: boolean; has_bp: boolean; has_symptoms: boolean }>
}

export async function getWeeklyStatus(patientId: string, endDate?: string) {
  const url = `${serverUrl()}/patient/weekly-status?patientId=${encodeURIComponent(patientId)}${endDate ? `&endDate=${encodeURIComponent(endDate)}` : ''}`
  const res = await fetch(url)
  if (!res.ok) return {}
  return res.json() as Promise<Record<string, { has_weight: boolean; has_symptoms: boolean }>>
}

export async function sendSymptomMessage(message: string, patientId: string) {
  // Use serverUrl() instead of bpServerUrl() logic
  const res = await fetch(`${serverUrl()}/api/chat/symptoms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, patientId })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to get response')
  }
  return res.json() as Promise<{ response: string; timestamp: string }>
}

export async function collectSmartbandData(patientId: string) {
  const res = await fetch(`${serverUrl()}/api/collect-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Failed to collect data")
  }
  return res.json()
}

export const postWaterSalt = async (data: any) => {
  const res = await fetch(`${serverUrl()}/water-salt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error("Failed")
  return res.json()
}

export async function getWaterSaltLogs(patientId: string, limit = 14) {
  const res = await fetch(`${serverUrl()}/water-salt?patientId=${encodeURIComponent(patientId)}&limit=${encodeURIComponent(String(limit))}`)
  if (!res.ok) throw new Error("Failed to load water and salt logs")
  return res.json() as Promise<{ logs: Array<{ id?: string; patient_id: string; water_intake: number; salt_intake: number; date: string }> }>
}

export async function processWeightImage(file: File, patientId: string) {
  const formData = new FormData()
  formData.append("image", file)
  formData.append("patientId", patientId)

  const response = await fetch(`${serverUrl()}/api/ocr/weight`, {
    method: "POST",
    body: formData,
  })

  const text = await response.text()

  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(text || "Server returned invalid JSON")
  }

  if (!response.ok) {
    throw new Error(data?.details || data?.error || "Weight OCR processing failed.")
  }

  return data
}