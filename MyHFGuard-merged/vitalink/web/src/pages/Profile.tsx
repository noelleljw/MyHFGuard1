import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLanguage } from "@/contexts/LanguageContext"
import { User, HeartPulse, Pill, Coins, Save, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase"

type ProfileForm = {
  fullName: string
  age: string
  ic: string
  systolicBP: string
  diastolicBP: string
  heartRate: string
  dryWeight: string
  height: string
  currentMedication: string
  language: "BM" | "BI"
  coins: number
}

const Profile = () => {
  const navigate = useNavigate()
  const { setLanguage, t } = useLanguage()

  const [form, setForm] = useState<ProfileForm>({
    fullName: "",
    age: "",
    ic: "",
    systolicBP: "",
    diastolicBP: "",
    heartRate: "",
    dryWeight: "",
    height: "",
    currentMedication: "",
    language: "BI",
    coins: 0,
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  const bmi = useMemo(() => {
    const weight = parseFloat(form.dryWeight)
    const heightCm = parseFloat(form.height)

    if (!weight || !heightCm) return ""

    const heightM = heightCm / 100
    const result = weight / (heightM * heightM)

    return result.toFixed(1)
  }, [form.dryWeight, form.height])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const user = sessionData.session?.user

        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (error) {
          console.error("Load profile error:", error)
          setLoading(false)
          return
        }

        if (data) {
          setForm({
            fullName: data.full_name || "",
            age: data.age?.toString() || "",
            ic: data.ic || "",
            systolicBP: data.systolic_bp?.toString() || "",
            diastolicBP: data.diastolic_bp?.toString() || "",
            heartRate: data.heart_rate?.toString() || "",
            dryWeight: data.dry_weight?.toString() || "",
            height: data.height?.toString() || "",
            currentMedication: data.current_medication || "",
            language: data.language === "BM" ? "BM" : "BI",
            coins: data.coins || 0,
          })

          setIsLocked(!!data.baseline_locked)

          if (data.profile_completed) {
            localStorage.setItem("profileCompleted", "true")
          }
        }
      } catch (err) {
        console.error("Unexpected profile load error:", err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) {
        alert("User session not found. Please log in again.")
        return
      }

      const profileData = {
        user_id: user.id,
        full_name: form.fullName,
        age: form.age ? Number(form.age) : null,
        ic: form.ic,
        systolic_bp: form.systolicBP ? Number(form.systolicBP) : null,
        diastolic_bp: form.diastolicBP ? Number(form.diastolicBP) : null,
        heart_rate: form.heartRate ? Number(form.heartRate) : null,
        dry_weight: form.dryWeight ? Number(form.dryWeight) : null,
        height: form.height ? Number(form.height) : null,
        bmi: bmi ? Number(bmi) : null,
        current_medication: form.currentMedication,
        language: form.language,
        coins: form.coins,
        profile_completed: true,
        baseline_locked: true,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "user_id" })

      if (error) {
        console.error("Save profile error:", error)
        alert("Failed to save profile.")
        return
      }

      localStorage.setItem("profileCompleted", "true")
      setLanguage(form.language)
      setIsLocked(true)

      alert("Profile saved successfully!")
      navigate("/")
    } catch (err) {
      console.error("Unexpected profile save error:", err)
      alert("Something went wrong while saving profile.")
    } finally {
      setSaving(false)
    }
  }

  const baselineInputClass =
    "w-full rounded-xl bg-background border border-border px-4 py-3 text-foreground outline-none focus:border-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-8 flex items-center justify-center">
        <div className="text-lg font-medium">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-8">
      <div className="max-w-6xl mx-auto">

        {/* ❌ Back button REMOVED here */}

        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">{t("myProfile")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("profileDesc")}
            </p>
          </div>

          {isLocked && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 px-4 py-2 text-cyan-600 dark:text-cyan-300">
              <Lock className="w-4 h-4" />
              {t("baselineLocked")}
            </div>
          )}
        </div>

        {/* rest of your code unchanged... */}

        {isLocked && (
          <div className="mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-400/20 px-5 py-4 text-yellow-700 dark:text-yellow-200">
            {t("baselineNotice")}
            You can still update your medication and language preference.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2 bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-5">
              <User className="w-6 h-6 text-cyan-500" />
              <h2 className="text-2xl font-semibold">{t("personalInformation")}</h2>            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm text-muted-foreground">{t("fullName")}</label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  disabled={isLocked}
                  placeholder={t("enterFullName")}
                  className={baselineInputClass}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-muted-foreground">{t("age")}</label>
                <input
                  type="number"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  disabled={isLocked}
                  placeholder={t("enterAge")}
                  className={baselineInputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block mb-2 text-sm text-muted-foreground">{t("icNumber")}</label>
                <input
                  type="text"
                  name="ic"
                  value={form.ic}
                  onChange={handleChange}
                  disabled={isLocked}
                  placeholder={t("enterIcNumber")}
                  className={baselineInputClass}
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-5">
              <Coins className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-semibold">{t("preferences")}</h2>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {t("language")} {form.language === "BM" ? "BM" : "EN"} — use the top language button to switch the whole app.
              </div>

              <div>
                <label className="block mb-2 text-sm text-muted-foreground">{t("coinCollection")}</label>
                <div className="rounded-xl bg-background border border-border px-4 py-3 text-xl font-semibold text-yellow-600 dark:text-yellow-300">
                  {form.coins} Coins
                </div>
              </div>
            </div>
          </div>

          {/* Baseline Health Data */}
          <div className="lg:col-span-2 bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-5">
              <HeartPulse className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-semibold">{t("baselineHealthData")}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm text-muted-foreground">
                  {t("bloodPressureSystolic")}
                </label>
                <input
                  type="number"
                  name="systolicBP"
                  value={form.systolicBP}
                  onChange={handleChange}
                  disabled={isLocked}
                  placeholder="e.g. 120"
                  className={baselineInputClass}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-muted-foreground">
                   {t("bloodPressureDiastolic")}
                </label>
                <input
                  type="number"
                  name="diastolicBP"
                  value={form.diastolicBP}
                  onChange={handleChange}
                  disabled={isLocked}
                  placeholder="e.g. 80"
                  className={baselineInputClass}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-muted-foreground">{t("heartRate")}</label>
                <input
                  type="number"
                  name="heartRate"
                  value={form.heartRate}
                  onChange={handleChange}
                  disabled={isLocked}
                  placeholder="e.g. 72"
                  className={baselineInputClass}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-muted-foreground">{t("dryWeight")}</label>
                <input
                  type="number"
                  step="0.1"
                  name="dryWeight"
                  value={form.dryWeight}
                  onChange={handleChange}
                  disabled={isLocked}
                  placeholder="e.g. 60"
                  className={baselineInputClass}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-muted-foreground">{t("height")}</label>
                <input
                  type="number"
                  step="0.1"
                  name="height"
                  value={form.height}
                  onChange={handleChange}
                  disabled={isLocked}
                  placeholder="e.g. 160"
                  className={baselineInputClass}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm text-muted-foreground">{t("bmi")}</label>
                <div className="rounded-xl bg-cyan-500/10 border border-cyan-400/20 px-4 py-3 text-cyan-600 dark:text-cyan-300 font-semibold">
                  {bmi || "Auto calculated"}
                </div>
              </div>
            </div>
          </div>

          {/* Medication */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-5">
              <Pill className="w-6 h-6 text-green-500" />
              <h2 className="text-2xl font-semibold">{t("currentMedication")}</h2>
            </div>

            <textarea
              name="currentMedication"
              value={form.currentMedication}
              onChange={handleChange}
              rows={10}
              placeholder={t("enterCurrentMedication")}
              className="w-full rounded-xl bg-background border border-border px-4 py-3 text-foreground outline-none focus:border-cyan-400 resize-none"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-[#02142f] font-semibold px-6 py-3 rounded-xl transition"
          >
            <Save className="w-5 h-5" />
            {saving ? "Saving..." : t("saveProfile")}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Profile