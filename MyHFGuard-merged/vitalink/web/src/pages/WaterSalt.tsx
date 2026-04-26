import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts"

type WaterSaltLog = {
  id?: string
  patient_id: string
  entry_date: string
  water_limit_ml: number
  water_cups: number
  water_intake_ml: number
  water_status: "green" | "orange" | "red"
  breakfast_salt: "natural" | "moderate" | "high"
  lunch_salt: "natural" | "moderate" | "high"
  dinner_salt: "natural" | "moderate" | "high"
  salt_score: number
  salt_status: "green" | "orange" | "red"
  created_at?: string
}

const CUP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]
const ML_PER_CUP = 250

function getWaterStatus(intakeMl: number, limitMl: number): "green" | "orange" | "red" {
  if (limitMl <= 0) return "green"
  if (intakeMl <= limitMl) return "green"
  if (intakeMl <= limitMl * 1.1) return "orange"
  return "red"
}

function getSaltStatus(score: number): "green" | "orange" | "red" {
  if (score <= 3) return "green"
  if (score <= 6) return "orange"
  return "red"
}

function getStatusClasses(status: "green" | "orange" | "red") {
  if (status === "green") {
    return {
      badge: "bg-green-100 text-green-700 border-green-200",
      bar: "bg-green-500",
      text: "text-green-600",
    }
  }

  if (status === "orange") {
    return {
      badge: "bg-orange-100 text-orange-700 border-orange-200",
      bar: "bg-orange-500",
      text: "text-orange-600",
    }
  }

  return {
    badge: "bg-red-100 text-red-700 border-red-200",
    bar: "bg-red-500",
    text: "text-red-600",
  }
}

function getSaltNumeric(value: "natural" | "moderate" | "high") {
  if (value === "natural") return 1
  if (value === "moderate") return 2
  return 3
}

function getSaltColor(value: number) {
  if (value <= 3) return "#22c55e"
  if (value <= 6) return "#f97316"
  return "#ef4444"
}

export default function WaterSalt() {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [patientId, setPatientId] = useState("")

  const [waterLimitMl, setWaterLimitMl] = useState("800")
  const [waterCups, setWaterCups] = useState(0)

  const [breakfastSalt, setBreakfastSalt] = useState<"natural" | "moderate" | "high">("natural")
  const [lunchSalt, setLunchSalt] = useState<"natural" | "moderate" | "high">("natural")
  const [dinnerSalt, setDinnerSalt] = useState<"natural" | "moderate" | "high">("natural")

  const saltOptions = [
    {
      value: "natural",
      label: t("waterDiet.saltOptions.natural", "Natural / Low Salt"),
      color: "bg-green-500",
    },
    {
      value: "moderate",
      label: t("waterDiet.saltOptions.moderate", "Moderate Salt"),
      color: "bg-orange-500",
    },
    {
      value: "high",
      label: t("waterDiet.saltOptions.high", "High Salt"),
      color: "bg-red-500",
    },
  ] as const

  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        toast.error(t("waterDiet.toast.unableSession", "Unable to load session"))
        return
      }

      const uid = data?.session?.user?.id || ""
      setPatientId(uid)
    }

    loadSession()
  }, [t])

  const logsQuery = useQuery({
    queryKey: ["water-salt-logs", patientId],
    enabled: !!patientId,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("water_salt_logs")
        .select("*")
        .eq("patient_id", patientId)
        .order("entry_date", { ascending: false })
        .limit(30)

      if (error) throw error
      return (data || []) as WaterSaltLog[]
    },
  })

  const waterIntakeMl = waterCups * ML_PER_CUP
  const waterStatus = getWaterStatus(waterIntakeMl, Number(waterLimitMl || 0))

  const saltScore =
    getSaltNumeric(breakfastSalt) +
    getSaltNumeric(lunchSalt) +
    getSaltNumeric(dinnerSalt)

  const saltStatus = getSaltStatus(saltScore)

  const waterStatusStyle = getStatusClasses(waterStatus)
  const saltStatusStyle = getStatusClasses(saltStatus)

  const latestLog = useMemo(() => logsQuery.data?.[0] || null, [logsQuery.data])

  const currentLocale = i18n.language === "ms" ? "ms-MY" : "en-US"

  const waterChartData = useMemo(() => {
    return (logsQuery.data || [])
      .slice()
      .reverse()
      .map((item) => ({
        date: new Date(item.entry_date).toLocaleDateString(currentLocale, {
          month: "short",
          day: "numeric",
        }),
        water: Number(item.water_intake_ml || 0),
        limit: Number(item.water_limit_ml || 0),
      }))
  }, [logsQuery.data, currentLocale])

  const saltChartData = useMemo(() => {
    return (logsQuery.data || [])
      .slice()
      .reverse()
      .map((item) => ({
        date: new Date(item.entry_date).toLocaleDateString(currentLocale, {
          month: "short",
          day: "numeric",
        }),
        saltScore: Number(item.salt_score || 0),
        fill: getSaltColor(Number(item.salt_score || 0)),
      }))
  }, [logsQuery.data, currentLocale])

  const entriesThisWeek = useMemo(() => {
    const logs = logsQuery.data || []
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 6)

    return logs.filter((log) => {
      const d = new Date(log.entry_date)
      return d >= start && d <= now
    }).length
  }, [logsQuery.data])

  const getWaterStatusLabel = (status: "green" | "orange" | "red") => {
    if (status === "green") return t("waterDiet.waterStatus.green", "Within Range")
    if (status === "orange") return t("waterDiet.waterStatus.orange", "Slightly Above Range")
    return t("waterDiet.waterStatus.red", "Exceeded Restriction")
  }

  const getSaltStatusLabel = (status: "green" | "orange" | "red") => {
    if (status === "green") return t("waterDiet.saltStatus.green", "Low Salt")
    if (status === "orange") return t("waterDiet.saltStatus.orange", "Moderate Salt")
    return t("waterDiet.saltStatus.red", "High Salt")
  }

  const submitToday = async () => {
    if (!patientId) {
      toast.error(t("waterDiet.toast.loginFirst", "Please log in first"))
      return
    }

    if (!waterLimitMl || waterCups <= 0) {
      toast.error(
        t("waterDiet.toast.fillWater", "Please enter water restriction and choose cups")
      )
      return
    }

    try {
      setLoading(true)

      const payload: WaterSaltLog = {
        patient_id: patientId,
        entry_date: new Date().toISOString().split("T")[0],
        water_limit_ml: Number(waterLimitMl),
        water_cups: waterCups,
        water_intake_ml: waterIntakeMl,
        water_status: waterStatus,
        breakfast_salt: breakfastSalt,
        lunch_salt: lunchSalt,
        dinner_salt: dinnerSalt,
        salt_score: saltScore,
        salt_status: saltStatus,
      }

      const { error } = await supabase
        .from("water_salt_logs")
        .upsert(payload, { onConflict: "patient_id,entry_date" })

      if (error) throw error

      toast.success(
        t("waterDiet.toast.saved", "Water and low salt diet saved successfully")
      )
      logsQuery.refetch()
    } catch (error: any) {
      toast.error(error?.message || t("waterDiet.toast.failed", "Failed to save record"))
    } finally {
      setLoading(false)
    }
  }

  const renderSaltSelector = (
    label: string,
    value: "natural" | "moderate" | "high",
    setValue: (value: "natural" | "moderate" | "high") => void
  ) => {
    return (
      <div className="space-y-3">
        <p className="font-medium">{label}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {saltOptions.map((option) => {
            const active = value === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue(option.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className={`mb-2 h-3 w-full rounded-full ${option.color}`} />
                <p className="text-sm font-medium">{option.label}</p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (logsQuery.isError) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium text-red-600">
              {t("waterDiet.error.loadTitle", "Failed to load water and salt data.")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "waterDiet.error.loadDesc",
                "Please make sure the table water_salt_logs exists in Supabase and RLS policies are added."
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold">
          {t("waterDiet.title", "My Water and Low Salt Diet")}
        </h1>
        <p className="text-muted-foreground">
          {t("waterDiet.subtitle", "Please submit daily or at least 3 times per week.")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("waterDiet.weekly.title", "Weekly Tracking Status")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              {t("waterDiet.weekly.entries", "Entries this week")}
            </p>
            <p className="mt-2 text-3xl font-bold">{entriesThisWeek}</p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              {t("waterDiet.weekly.target", "Target")}
            </p>
            <p className="mt-2 text-3xl font-bold">
              {t("waterDiet.weekly.targetValue", "3 times")}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              {t("waterDiet.weekly.status", "Status")}
            </p>
            <p
              className={`mt-2 text-lg font-semibold ${
                entriesThisWeek >= 3 ? "text-green-600" : "text-orange-600"
              }`}
            >
              {entriesThisWeek >= 3
                ? t("waterDiet.weekly.onTrack", "On Track")
                : t("waterDiet.weekly.needMore", "Need More Entries")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("waterDiet.waterCard.title", "My Water Intake")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("waterDiet.waterCard.limitLabel", "Doctor Water Restriction (ml)")}
              </label>
              <Input
                type="number"
                value={waterLimitMl}
                onChange={(e) => setWaterLimitMl(e.target.value)}
                placeholder={t("waterDiet.waterCard.placeholder", "Example: 800")}
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium">
                {t("waterDiet.waterCard.selectLabel", "Select Today Water Intake (8 cups)")}
              </label>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {CUP_OPTIONS.map((cup) => {
                  const active = waterCups === cup
                  return (
                    <button
                      key={cup}
                      type="button"
                      onClick={() => setWaterCups(cup)}
                      className={`rounded-xl border p-3 text-center transition ${
                        active
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-2xl">🥤</div>
                      <div className="mt-1 text-sm font-medium">{cup}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("waterDiet.waterCard.selectedIntake", "Selected Intake")}
                </span>
                <span className="font-semibold">{waterIntakeMl} ml</span>
              </div>

              <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${waterStatusStyle.bar}`}
                  style={{
                    width: `${Math.min(
                      100,
                      Number(waterLimitMl) > 0
                        ? (waterIntakeMl / Number(waterLimitMl)) * 100
                        : 0
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>0 ml</span>
                <span>
                  {t("waterDiet.waterCard.limitText", "Limit")}: {waterLimitMl || 0} ml
                </span>
              </div>

              <div
                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-medium ${waterStatusStyle.badge}`}
              >
                {getWaterStatusLabel(waterStatus)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("waterDiet.saltCard.title", "My Low Salt Diet")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {renderSaltSelector(
              t("waterDiet.meals.breakfast", "Breakfast"),
              breakfastSalt,
              setBreakfastSalt
            )}
            {renderSaltSelector(
              t("waterDiet.meals.lunch", "Lunch"),
              lunchSalt,
              setLunchSalt
            )}
            {renderSaltSelector(
              t("waterDiet.meals.dinner", "Dinner"),
              dinnerSalt,
              setDinnerSalt
            )}

            <div className="rounded-xl border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("waterDiet.saltCard.dailyScore", "Daily Salt Score")}
                </span>
                <span className="font-semibold">{saltScore} / 9</span>
              </div>

              <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${saltStatusStyle.bar}`}
                  style={{ width: `${(saltScore / 9) * 100}%` }}
                />
              </div>

              <div
                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-medium ${saltStatusStyle.badge}`}
              >
                {getSaltStatusLabel(saltStatus)}
              </div>
            </div>

            <Button onClick={submitToday} disabled={loading} className="w-full">
              {loading
                ? t("waterDiet.buttons.saving", "Saving...")
                : t("waterDiet.buttons.save", "Save Today Entry")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("waterDiet.summary.title", "Latest Summary")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              {t("waterDiet.summary.waterRestriction", "Water Restriction")}
            </p>
            <p className="mt-2 text-2xl font-bold">{latestLog?.water_limit_ml ?? 0} ml</p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              {t("waterDiet.summary.todayWater", "Today Water Intake")}
            </p>
            <p className="mt-2 text-2xl font-bold">{latestLog?.water_intake_ml ?? 0} ml</p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              {t("waterDiet.summary.waterStatus", "Water Status")}
            </p>
            <p
              className={`mt-2 text-lg font-bold ${getStatusClasses(
                latestLog?.water_status || "green"
              ).text}`}
            >
              {latestLog?.water_status
                ? getWaterStatusLabel(latestLog.water_status)
                : "-"}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              {t("waterDiet.summary.saltStatus", "Salt Status")}
            </p>
            <p
              className={`mt-2 text-lg font-bold ${getStatusClasses(
                latestLog?.salt_status || "green"
              ).text}`}
            >
              {latestLog?.salt_status
                ? getSaltStatusLabel(latestLog.salt_status)
                : "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("waterDiet.charts.waterGraph", "Water Intake Graph")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-h-[320px]">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={waterChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="water"
                    name={t("waterDiet.charts.waterLine", "Water Intake (ml)")}
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="limit"
                    name={t("waterDiet.charts.limitLine", "Restriction (ml)")}
                    stroke="#16a34a"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("waterDiet.charts.saltGraph", "Low Salt Diet Graph")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-h-[320px]">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={saltChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 9]} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="saltScore"
                    name={t("waterDiet.charts.saltBar", "Salt Score")}
                  >
                    {saltChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}