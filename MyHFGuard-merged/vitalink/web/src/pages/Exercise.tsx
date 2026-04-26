import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Footprints,
  MapPinned,
  Timer,
  Activity,
  Target,
  BellRing,
  CheckCircle2,
  Smartphone,
  CalendarDays,
  Download,
  HeartPulse,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getPatientSummary, getPatientVitals } from "@/lib/api"
import { format, formatDistanceToNow, startOfWeek } from "date-fns"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from "recharts"

const getWeekKey = () => {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  return format(weekStart, "yyyy-MM-dd")
}

const Exercise = () => {
  const { t } = useLanguage()
  const [patientId, setPatientId] = useState<string | undefined>()
  const [selectedGoal, setSelectedGoal] = useState<string>("goalBetterSleep")
  const [goalSaved, setGoalSaved] = useState(false)
  const [collecting, setCollecting] = useState(false)

  const currentWeekKey = getWeekKey()
  const currentWeekLabel = `Week of ${format(new Date(currentWeekKey), "d MMM yyyy")}`

  const weeklyGoals = [
    { key: "goalBetterSleep", label: t("goalBetterSleep") },
    { key: "goalBoostedEnergy", label: t("goalBoostedEnergy") },
    { key: "goalWalkWithEase", label: t("goalWalkWithEase") },
    { key: "goalLessPain", label: t("goalLessPain") },
    { key: "goalFeelBetter", label: t("goalFeelBetter") },
    { key: "goalReducedBreathlessness", label: t("goalReducedBreathlessness") },
    { key: "goalLessFatigue", label: t("goalLessFatigue") },
    { key: "goalMoreHouseEnergy", label: t("goalMoreHouseEnergy") },
    { key: "goalMoreSocialEnergy", label: t("goalMoreSocialEnergy") },
    { key: "goalImprovedAppetite", label: t("goalImprovedAppetite") },
  ]

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      const uid = data?.session?.user?.id
      setPatientId(uid)
      if (uid) {
        const savedGoalKey = localStorage.getItem(`exerciseGoal:${uid}:${currentWeekKey}`)
        if (savedGoalKey) setSelectedGoal(savedGoalKey)
      }
    }
    init()
  }, [currentWeekKey])

  const summaryQuery = useQuery({
    queryKey: ["patient-summary", patientId],
    queryFn: () => getPatientSummary(patientId),
    enabled: !!patientId,
    refetchOnWindowFocus: false,
  })

  const vitalsQuery = useQuery({
    queryKey: ["patient-vitals-exercise", patientId],
    queryFn: () => getPatientVitals(patientId, "hourly"),
    enabled: !!patientId,
    refetchOnWindowFocus: false,
  })

  const summary = summaryQuery.data?.summary || {}
  const vitals = vitalsQuery.data?.vitals || {}

  const stepCount = summary.stepsToday || 0
  const distanceKm = summary.distanceToday || 0
  const exerciseMinutes = stepCount > 0 ? Math.max(10, Math.round(stepCount / 100)) : 0
  const spo2 = vitals.spo2?.length ? Math.round(vitals.spo2[vitals.spo2.length - 1].avg || 0) : 98

  const stepTarget = 3000
  const baselineSteps = 2000
  const stepProgress = Math.min(100, Math.round((stepCount / stepTarget) * 100))
  const stepGap = Math.max(0, stepTarget - stepCount)
  const toleratedWell = stepCount >= baselineSteps
  const targetReached = stepCount >= stepTarget

  const syncDisplay = summary.lastSyncTs
    ? formatDistanceToNow(new Date(summary.lastSyncTs), { addSuffix: true })
    : t("notSyncedYet")

  const recommendation = useMemo(() => {
    if (targetReached) return t("exerciseRecommendationReached")
    if (toleratedWell) return t("exerciseRecommendationGood")
    return t("exerciseRecommendationSlow")
  }, [targetReached, toleratedWell, t])

  const stepChartData = (vitals.steps || []).slice(-12).map((item) => ({
    time: new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    steps: item.count,
  }))

  const hrChartData = (vitals.hr || []).slice(-12).map((item) => ({
    time: new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    hr: Math.round(item.avg || 0),
  }))

  const spo2ChartData = (vitals.spo2 || []).slice(-12).map((item) => ({
    time: new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    spo2: Math.round(item.avg || 0),
  }))

  const handleSaveGoal = () => {
    if (!patientId) {
      toast.error(t("userNotFound"))
      return
    }
    localStorage.setItem(`exerciseGoal:${patientId}:${currentWeekKey}`, selectedGoal)
    setGoalSaved(true)
    toast.success(t("goalSaved"))
    setTimeout(() => setGoalSaved(false), 2000)
  }

  const handleCollectData = async () => {
    if (!patientId) {
      toast.error(t("userNotFound"))
      return
    }

    setCollecting(true)
    try {
      await Promise.all([summaryQuery.refetch(), vitalsQuery.refetch()])
      toast.success(t("latestExerciseLoaded"))
    } catch (err) {
      toast.error(t("failedExerciseLoad"))
    } finally {
      setCollecting(false)
    }
  }

  const currentGoalLabel = weeklyGoals.find((goal) => goal.key === selectedGoal)?.label || t("goalBetterSleep")

  return (
    <div className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold">{t("exerciseTitle")}</h1>
            <p className="mt-2 text-muted-foreground">{t("exerciseDesc")}</p>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm">
            <Smartphone className="h-4 w-4 text-primary" />
            <span>{t("lastSynced")} : {syncDisplay}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Target className="text-primary" />
              <h2 className="text-xl font-semibold">{t("weeklyGoal")}</h2>
            </div>

            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              {currentWeekLabel}
            </div>

            <p className="mb-3 text-muted-foreground">{t("selectGoal")}</p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {weeklyGoals.map((goal) => (
                <button
                  key={goal.key}
                  onClick={() => setSelectedGoal(goal.key)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedGoal === goal.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {goal.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={handleSaveGoal}>{t("saveGoal")}</Button>
              {goalSaved && (
                <p className="inline-flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("goalSaved")}
                </p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-border bg-muted px-4 py-3">
              <p className="text-sm text-muted-foreground">{t("currentGoal")}</p>
              <p className="mt-1 text-lg font-semibold text-primary">{currentGoalLabel}</p>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Button onClick={handleCollectData} className="flex h-[120px] w-full items-center justify-center gap-2 text-lg font-semibold">
              <Download className="h-5 w-5" />
              {collecting || summaryQuery.isFetching || vitalsQuery.isFetching ? t("collecting") : t("collectData")}
            </Button>

            <Card className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <Footprints className="text-yellow-500" />
                <h2 className="text-xl font-semibold">{t("dailyTarget")}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{t("minimumTarget")}</p>
              <div className="mt-2 text-4xl font-bold text-yellow-500">{stepTarget}</div>
              <p className="text-sm text-muted-foreground">{t("stepsPerDay")}</p>
              <div className="mt-4 h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${stepProgress}%` }} />
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-muted-foreground">{stepCount} / {stepTarget} {t("stepsCompleted")}</p>
                <p className="font-medium">{targetReached ? t("targetAchieved") : `${stepGap} ${t("stepsRemaining")}`}</p>
              </div>
            </Card>

            <Card className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="text-pink-600 dark:text-pink-400" />
                <h3 className="font-semibold">{t("oximetry")}</h3>
              </div>
              <div className="text-3xl font-bold">{spo2}%</div>
              <p className="mt-2 text-muted-foreground">{t("spo2Desc")}</p>
            </Card>

            <Card className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <BellRing className="text-yellow-500" />
                <h3 className="font-semibold">{t("exerciseReminder")}</h3>
              </div>
              <p className="text-muted-foreground">{recommendation}</p>
            </Card>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <Footprints className="text-primary" />
              <h3 className="font-semibold">{t("stepCount")}</h3>
            </div>
            <div className="text-3xl font-bold">{stepCount}</div>
            <p className="mt-2 text-muted-foreground">{t("todaySteps")}</p>
          </Card>

          <Card className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <MapPinned className="text-green-600 dark:text-green-400" />
              <h3 className="font-semibold">{t("distance")}</h3>
            </div>
            <div className="text-3xl font-bold">{distanceKm} km</div>
            <p className="mt-2 text-muted-foreground">{t("distanceDesc")}</p>
          </Card>

          <Card className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <Timer className="text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold">{t("exerciseTime")}</h3>
            </div>
            <div className="text-3xl font-bold">{exerciseMinutes} min</div>
            <p className="mt-2 text-muted-foreground">{t("exerciseTimeDesc")}</p>
          </Card>

          <Card className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <HeartPulse className="text-rose-600 dark:text-rose-400" />
              <h3 className="font-semibold">{t("heartRate")}</h3>
            </div>
            <div className="text-3xl font-bold">{hrChartData.length ? hrChartData[hrChartData.length - 1].hr : 0} bpm</div>
            <p className="mt-2 text-muted-foreground">{t("latestReading")}</p>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm">
            <h3 className="mb-4 font-semibold">{t("stepCount")}</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stepChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="steps" name={t("stepCount")} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm">
            <h3 className="mb-4 font-semibold">{t("heartRate")}</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hrChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="hr" name={t("heartRate")} stroke="#dc2626" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm">
            <h3 className="mb-4 font-semibold">SpO₂</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spo2ChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[80, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="spo2" name="SpO₂" stroke="#059669" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="mt-6 rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold">{t("exerciseNotes")}</h2>
          <p className="mt-2 text-muted-foreground">{t("exerciseNotesDesc")}</p>
        </Card>
      </div>
    </div>
  )
}

export default Exercise
