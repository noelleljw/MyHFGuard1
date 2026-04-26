import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/contexts/LanguageContext"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  Pill,
  Info,
  CalendarDays,
  BellRing,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"

type MedicationEntry = {
  name: string
  reminderTime: "12:00 PM" | "10:00 PM"
}

type ReminderItem = {
  id: string
  title: string
  due_ts: string
  notes?: string | null
  status?: string | null
  type?: string | null
}

const STATIN_KEYWORDS = [
  "statin",
  "atorvastatin",
  "simvastatin",
  "rosuvastatin",
  "pravastatin",
  "lovastatin",
  "fluvastatin",
  "pitavastatin",
]

function normalizeMedicationList(raw: string): MedicationEntry[] {
  if (!raw) return []

  return raw
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((line) => {
      const lower = line.toLowerCase()

      const explicitNight =
        lower.includes("(10pm)") ||
        lower.includes("(10 pm)")

      const cleanedName = line
        .replace(/\(10\s*pm\)/gi, "")
        .trim()

      const isStatin = STATIN_KEYWORDS.some((keyword) =>
        cleanedName.toLowerCase().includes(keyword)
      )

      return {
        name: cleanedName,
        reminderTime: explicitNight || isStatin ? "10:00 PM" : "12:00 PM",
      }
    })
}

const Medication = () => {
  const { t } = useLanguage()
  const [patientId, setPatientId] = useState<string | undefined>(undefined)

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    notes: "",
  })

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      const id = data?.session?.user?.id || undefined
      if (mounted) setPatientId(id)
    }

    init()
    return () => {
      mounted = false
    }
  }, [])

  const profileQuery = useQuery({
    queryKey: ["profile-medication", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("current_medication")
        .eq("user_id", patientId)
        .maybeSingle()

      if (error) throw error
      return data
    },
  })

  const remindersQuery = useQuery({
    queryKey: ["reminders", patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<ReminderItem[]> => {
      const { data, error } = await supabase
        .from("reminders")
        .select("id, title, due_ts, notes, status, type")
        .eq("patient_id", patientId)
        .order("due_ts", { ascending: true })

      if (error) throw error
      return data || []
    },
  })

  const medicationEntries = useMemo(() => {
    return normalizeMedicationList(profileQuery.data?.current_medication || "")
  }, [profileQuery.data])

  const noonMedications = medicationEntries.filter(
    (m) => m.reminderTime === "12:00 PM"
  )

  const nightMedications = medicationEntries.filter(
    (m) => m.reminderTime === "10:00 PM"
  )

  const upcomingAppointments = useMemo(() => {
    const now = new Date()
    return (remindersQuery.data || [])
      .filter((r) => new Date(r.due_ts) >= now)
      .slice(0, 10)
  }, [remindersQuery.data])

  const resetForm = () => {
    setForm({
      title: "",
      date: "",
      time: "",
      notes: "",
    })
    setEditingReminderId(null)
    setShowForm(false)
  }

  const handleOpenAddForm = () => {
    setEditingReminderId(null)
    setForm({
      title: "",
      date: "",
      time: "",
      notes: "",
    })
    setShowForm((prev) => !prev)
  }

  const handleEditReminder = (reminder: ReminderItem) => {
    const dt = new Date(reminder.due_ts)

    const localDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
      dt.getDate()
    ).padStart(2, "0")}`

    const localTime = `${String(dt.getHours()).padStart(2, "0")}:${String(
      dt.getMinutes()
    ).padStart(2, "0")}`

    setEditingReminderId(reminder.id)
    setForm({
      title: reminder.title || "",
      date: localDate,
      time: localTime,
      notes: reminder.notes || "",
    })
    setShowForm(true)
  }

  const handleSaveReminder = async () => {
    if (!patientId) {
      alert("Patient not found.")
      return
    }

    if (!form.title || !form.date || !form.time) {
      alert("Please fill in title, date and time.")
      return
    }

    try {
      setSaving(true)

      const datetime = new Date(`${form.date}T${form.time}`)

      if (Number.isNaN(datetime.getTime())) {
        alert("Invalid date or time.")
        return
      }

      if (editingReminderId) {
        const { error } = await supabase
          .from("reminders")
          .update({
            title: form.title,
            due_ts: datetime.toISOString(),
            notes: form.notes || null,
            status: "upcoming",
          })
          .eq("id", editingReminderId)
          .eq("patient_id", patientId)

        if (error) {
          console.error("Update reminder error:", error)
          alert(`Failed to update reminder: ${error.message}`)
          return
        }
      } else {
        const { error } = await supabase.from("reminders").insert({
          patient_id: patientId,
          title: form.title,
          type: "general",
          due_ts: datetime.toISOString(),
          notes: form.notes || null,
          status: "upcoming",
        })

        if (error) {
          console.error("Save reminder error:", error)
          alert(`Failed to save reminder: ${error.message}`)
          return
        }
      }

      resetForm()
      await remindersQuery.refetch()
    } catch (err) {
      console.error("Unexpected reminder save/update error:", err)
      alert("Something went wrong while saving reminder.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteReminder = async (id: string) => {
    if (!patientId) return

    const confirmed = window.confirm("Delete this reminder?")
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("id", id)
        .eq("patient_id", patientId)

      if (error) {
        console.error("Delete reminder error:", error)
        alert(`Failed to delete reminder: ${error.message}`)
        return
      }

      if (editingReminderId === id) {
        resetForm()
      }

      await remindersQuery.refetch()
    } catch (err) {
      console.error("Unexpected reminder delete error:", err)
      alert("Something went wrong while deleting reminder.")
    }
  }

  const ReminderCard = ({
    title,
    time,
    meds,
  }: {
    title: string
    time: string
    meds: MedicationEntry[]
  }) => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge>{time}</Badge>
        </div>
        <CardDescription>{time}</CardDescription>
      </CardHeader>

      <CardContent>
        {meds.length > 0 ? (
          <div className="space-y-2">
            {meds.map((med, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-primary" />
                  <span>{med.name}</span>
                </div>
                <BellRing className="w-4 h-4 text-primary" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {t("noMedicationForThisReminderTime")}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mt-4">
          {t("myMedicationReminder")}
        </h1>

        <p className="text-muted-foreground mb-6">
          {t("medicationReminderDesc")}
        </p>

        <Alert className="mb-6">
          <Info className="w-4 h-4" />
          <AlertDescription>
            {t("medicationPageInfo")}
          </AlertDescription>
        </Alert>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle>{t("nextAppointmentReminder")}</CardTitle>
                  <CardDescription className="mt-1">
                    {t("nextAppointmentReminderDesc")}
                  </CardDescription>
                </div>
              </div>

              <Button
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("addReminder")}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {showForm && (
              <div className="mb-4 rounded-xl border bg-muted/20 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm text-muted-foreground">
                      {t("reminderTitle")}
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder={t("reminderTitlePlaceholder")}
                      className="w-full rounded-xl bg-background border border-border px-4 py-3 text-foreground outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm text-muted-foreground">
                        {t("reminderDate")}
                      </label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, date: e.target.value }))
                        }
                        className="w-full rounded-xl bg-background border border-border px-4 py-3 text-foreground outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm text-muted-foreground">
                        {t("reminderTime")}
                      </label>
                      <input
                        type="time"
                        value={form.time}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, time: e.target.value }))
                        }
                        className="w-full rounded-xl bg-background border border-border px-4 py-3 text-foreground outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm text-muted-foreground">
                      {t("reminderNotes")}
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder={t("reminderNotesPlaceholder")}
                      rows={3}
                      className="w-full rounded-xl bg-background border border-border px-4 py-3 text-foreground outline-none focus:border-cyan-400 resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleSaveReminder} disabled={saving}>
                      {saving
                        ? t("savingReminder")
                        : editingReminderId
                        ? t("updateReminder")
                        : t("saveReminder")}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={resetForm}
                      disabled={saving}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {upcomingAppointments.length > 0 ? (
              <div className="space-y-2">
                {upcomingAppointments.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 border rounded-lg flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(a.due_ts).toLocaleString()}
                      </p>
                      {a.notes ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          {a.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditReminder(a)}
                        className="inline-flex items-center gap-1"
                      >
                        <Pencil className="w-4 h-4" />
                        {t("edit")}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReminder(a.id)}
                        className="inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        {t("delete")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>{t("noUpcomingAppointmentReminder")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("medicationFromProfile")}</CardTitle>
            <CardDescription>{t("medicationFromProfileDesc")}</CardDescription>
          </CardHeader>

          <CardContent>
            {medicationEntries.length > 0 ? (
              <div className="space-y-2">
                {medicationEntries.map((med, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 border rounded-lg"
                  >
                    <span>{med.name}</span>
                    <Badge>{med.reminderTime}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p>{t("noMedicationFoundInProfile")}</p>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <ReminderCard
            title={t("noonReminder")}
            time={t("twelveNoon")}
            meds={noonMedications}
          />

          <ReminderCard
            title={t("nightReminder")}
            time={t("tenPm")}
            meds={nightMedications}
          />
        </div>
      </div>
    </div>
  )
}

export default Medication