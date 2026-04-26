import educationImg from "@/assets/education.jpg"
import selfCheckImg from "@/assets/selfcheck.jpg"
import waterImg from "@/assets/Water.jpg"
import exerciseImg from "@/assets/Exercise.jpg"
import reminderImg from "@/assets/reminder.jpg"
import supportImg from "@/assets/support.jpg"

import { useEffect, useState, memo } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Smartphone } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getPatientSummary, getPatientInfo, serverUrl } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { formatDistanceToNow, format } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"

const Dashboard = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const ClockDisplay = memo(() => {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
      const timer = setInterval(() => setNow(new Date()), 1000)
      return () => clearInterval(timer)
    }, [])

    return (
      <div className="text-left md:text-right">
        <p className="text-base md:text-lg font-medium text-muted-foreground">
          {format(now, "d MMM yyyy")}
        </p>
        <p className="text-3xl md:text-4xl font-bold text-primary">
          {format(now, "h:mm a")}
        </p>
      </div>
    )
  })

  const [patientId, setPatientId] = useState<string | undefined>(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("patientId") || undefined
      : undefined
  )

  const [showSyncNotice, setShowSyncNotice] = useState(true)

  useEffect(() => {
    let mounted = true

    async function init() {
      if (patientId) return
      const { data } = await supabase.auth.getSession()
      const id = data?.session?.user?.id || undefined
      if (mounted) setPatientId(id)
    }

    init()
    return () => {
      mounted = false
    }
  }, [patientId])

  const { data } = useQuery({
    queryKey: ["patient-summary", patientId],
    queryFn: () => getPatientSummary(patientId),
    refetchOnWindowFocus: false,
    enabled: !!patientId,
  })

  const infoQuery = useQuery({
    queryKey: ["patient-info", patientId],
    queryFn: () => getPatientInfo(patientId),
    refetchOnWindowFocus: false,
    enabled: !!patientId,
  })

  useEffect(() => {
    async function syncIfDefault() {
      if (!patientId) return
      const pr = infoQuery.data?.patient
      const isDefault =
        !pr || (pr.first_name === "User" && pr.last_name === "Patient")
      if (!isDefault) return

      const { data } = await supabase.auth.getSession()
      const meta: any = data?.session?.user?.user_metadata || {}
      const firstName = meta.firstName
      const lastName = meta.lastName
      const dateOfBirth = meta.dateOfBirth

      if (!firstName && !lastName && !dateOfBirth) return

      try {
        await fetch(`${serverUrl()}/admin/ensure-patient`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId, firstName, lastName, dateOfBirth }),
        })
        infoQuery.refetch()
      } catch (_) {}
    }

    syncIfDefault()
  }, [patientId, infoQuery.data])

  const summary = data?.summary || {}
  const lastSyncFromSummary = summary.lastSyncTs
    ? new Date(summary.lastSyncTs)
    : undefined

  const lastSyncDisplay =
    lastSyncFromSummary && !Number.isNaN(lastSyncFromSummary.getTime())
      ? formatDistanceToNow(lastSyncFromSummary, { addSuffix: true })
      : summary.lastSyncTs || "unknown"

  const homeComponents = [
    {
      title: t("myLearning"),
      description: t("myLearningDesc"),
      image: educationImg,
      action: () => navigate("/education"),
    },
    {
      title: t("mySelfCheck"),
      description: t("mySelfCheckDesc"),
      image: selfCheckImg,
      action: () =>
        navigate(
          patientId
            ? `/self-check?patientId=${encodeURIComponent(patientId)}`
            : "/self-check"
        ),
    },
    {
      title: t("myWaterDiet"),
      description: t("myWaterDietDesc"),
      image: waterImg,
      action: () => navigate("/water-diet"),
    },
    {
      title: t("myExercise"),
      description: t("myExerciseDesc"),
      image: exerciseImg,
      action: () => navigate("/exercise"),
    },
    {
      title: t("myMedicationReminder"),
      description: t("myMedicationReminderDesc"),
      image: reminderImg,
      action: () => navigate("/medication"),
    },
    {
      title: t("myChat"),
      description: t("myChatDesc"),
      image: supportImg,
      action: () => navigate("/ai-assistant"),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {t("dashboardWelcome")}, {infoQuery.data?.patient?.first_name || t("patient")}
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              {t("dashboardChooseSection")}
            </p>
          </div>
          <ClockDisplay />
        </div>

        {showSyncNotice && (
          <Alert className="mb-8 border-primary/40 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm">
            <Smartphone className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm md:text-base">
                <strong>{t("syncRequired")}</strong> {t("lastSynced")} {lastSyncDisplay}. {t("openAppToSync")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSyncNotice(false)}
                className="ml-4"
              >
                {t("dismiss")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {homeComponents.map((item) => (
            <Card
              key={item.title}
              onClick={item.action}
              className="cursor-pointer overflow-hidden border-0 shadow-md hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div
                className="relative min-h-[220px] bg-cover bg-center"
                style={{ backgroundImage: `url(${item.image})` }}
              >
                <div className="absolute inset-0 bg-black/45" />

                <div className="relative z-10 flex h-full flex-col justify-end p-6 text-white">
                  <h2 className="text-3xl font-bold mb-2">{item.title}</h2>
                  <p className="text-sm md:text-base text-white/90 leading-6 max-w-[90%]">
                    {item.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard