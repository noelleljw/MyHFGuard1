import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Weight,
  AlertCircle,
  Activity,
  Calendar as CalendarIcon,
  Minus,
  Plus,
  Loader2,
  Upload,
  History,
  Camera,
  X,
  CheckCircle2,
  XCircle,
  ScanLine,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import {
  postWeightSample,
  postSymptomLog,
  getDailyStatus,
  getWeeklyStatus,
  processImage,
  processWeightImage,
  addManualEvent,
  getHealthEvents,
} from "@/lib/api"
import { format, addDays, isSameDay, isToday } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import correctImage from "@/assets/correct_image.jpeg"
import slantedImage from "@/assets/slanted_image.jpg"
import { useTranslation } from "react-i18next"

type SelfCheckTab = "weight" | "symptoms" | "vitals"

const SelfCheck = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [patientId, setPatientId] = useState<string | undefined>(
    typeof window !== "undefined"
      ? (
          new URLSearchParams(window.location.search).get("patientId") ||
          new URLSearchParams(window.location.hash.split("?")[1] || "").get("patientId") ||
          undefined
        )
      : undefined
  )

  const [activeTab, setActiveTab] = useState<SelfCheckTab>(
    typeof window !== "undefined"
      ? (() => {
          const search = new URLSearchParams(window.location.search)
          const hash = new URLSearchParams(window.location.hash.split("?")[1] || "")
          const tab = search.get("tab") || hash.get("tab")
          if (tab === "symptoms") return "symptoms"
          if (tab === "vitals") return "vitals"
          return "weight"
        })()
      : "weight"
  )

  const [weightKg, setWeightKg] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dailyStatus, setDailyStatus] = useState<{
    has_weight: boolean
    has_bp: boolean
    has_symptoms: boolean
  }>({
    has_weight: false,
    has_bp: false,
    has_symptoms: false,
  })
  const [weeklyStatus, setWeeklyStatus] = useState<Record<string, { has_weight: boolean; has_symptoms: boolean }>>(
    {}
  )

  const [symptoms, setSymptoms] = useState<Record<string, number>>({
    cough: 0,
    breathlessness: 0,
    swelling: 0,
    weightGain: 0,
    abdomen: 0,
    sleeping: 0,
  })

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    desc: string
    action: () => void
    isAlert?: boolean
  }>({
    open: false,
    title: "",
    desc: "",
    action: () => {},
    isAlert: false,
  })

  const [vitalsTab, setVitalsTab] = useState("scan")
  const [loadingVitals, setLoadingVitals] = useState(false)
  const [ocrResult, setOcrResult] = useState<any>(null)
  const [manualForm, setManualForm] = useState({ sys: "", dia: "", pulse: "" })
  const [events, setEvents] = useState<any[]>([])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cameraMode, setCameraMode] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [pendingAction, setPendingAction] = useState<"camera" | "upload" | null>(null)

  const [selectedWeightImage, setSelectedWeightImage] = useState<File | null>(null)
  const [weightPreviewUrl, setWeightPreviewUrl] = useState<string | null>(null)
  const [weightCameraMode, setWeightCameraMode] = useState(false)
  const [loadingWeightScan, setLoadingWeightScan] = useState(false)
  const [weightScanResult, setWeightScanResult] = useState<any>(null)
  const [showWeightInstructions, setShowWeightInstructions] = useState(false)
  const [pendingWeightAction, setPendingWeightAction] = useState<"camera" | "upload" | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const weightVideoRef = useRef<HTMLVideoElement>(null)
  const weightStreamRef = useRef<MediaStream | null>(null)
  const weightFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      if (patientId) return
      const { data } = await supabase.auth.getSession()
      const id = data?.session?.user?.id || undefined
      if (mounted) {
        setPatientId(id)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [patientId])

  useEffect(() => {
    if (typeof window === "undefined") return

    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.split("?")[1] || "")
    const tab = search.get("tab") || hash.get("tab")

    if (tab === "symptoms") setActiveTab("symptoms")
    else if (tab === "vitals") setActiveTab("vitals")
    else setActiveTab("weight")
  }, [])

  useEffect(() => {
    if (!patientId) return

    const dateStr = format(selectedDate, "yyyy-MM-dd")
    getDailyStatus(patientId, dateStr).then(setDailyStatus)
    getWeeklyStatus(patientId, format(new Date(), "yyyy-MM-dd")).then(setWeeklyStatus)
  }, [patientId, selectedDate, submitting])

  useEffect(() => {
    if (!patientId) return
    fetchEvents()
  }, [patientId])

  useEffect(() => {
    if (cameraMode && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraMode])

  useEffect(() => {
    if (weightCameraMode && weightVideoRef.current && weightStreamRef.current) {
      weightVideoRef.current.srcObject = weightStreamRef.current
    }
  }, [weightCameraMode])

  useEffect(() => {
    return () => {
      stopCamera()
      stopWeightCamera()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (weightPreviewUrl) URL.revokeObjectURL(weightPreviewUrl)
    }
  }, [previewUrl, weightPreviewUrl])

  async function fetchEvents() {
    try {
      if (!patientId) return
      const dataEvents = await getHealthEvents(patientId)
      setEvents(dataEvents || [])
    } catch (err) {
      console.error(err)
    }
  }

  const getSymptomColor = (value: number) => {
    if (value <= 0) return "#22c55e"
    if (value === 1) return "#84cc16"
    if (value === 2) return "#eab308"
    if (value === 3) return "#f59e0b"
    if (value === 4) return "#f97316"
    return "#ef4444"
  }

  const getSymptomLabel = (value: number) => {
    if (value === 0) return t("selfCheck.noSymptom")
    if (value <= 2) return t("selfCheck.mild")
    return t("selfCheck.severe")
  }

  async function submitWeightLog() {
    setConfirmDialog((prev) => ({ ...prev, open: false }))
    setSubmitting(true)

    try {
      const kg = parseFloat(weightKg)
      const timeTs = isToday(selectedDate)
        ? new Date().toISOString()
        : new Date(format(selectedDate, "yyyy-MM-dd") + "T12:00:00").toISOString()

      const res = await postWeightSample({ patientId: patientId!, kg, timeTs })
      if ((res as any)?.error) throw new Error((res as any).error)

      toast.success(t("selfCheck.toast.weightSaved"))
      setWeightKg("")
      setSelectedWeightImage(null)
      setWeightPreviewUrl(null)
      setWeightScanResult(null)

      const dateStr = format(selectedDate, "yyyy-MM-dd")
      getDailyStatus(patientId!, dateStr).then(setDailyStatus)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || t("selfCheck.toast.weightFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogWeight = () => {
    if (!patientId || !weightKg) return

    const kg = parseFloat(weightKg)
    if (isNaN(kg) || kg < 20 || kg > 300) {
      setConfirmDialog({
        open: true,
        title: t("selfCheck.invalidWeightTitle"),
        desc: t("selfCheck.invalidWeightDesc"),
        action: () => setConfirmDialog((prev) => ({ ...prev, open: false })),
        isAlert: true,
      })
      return
    }

    setConfirmDialog({
      open: true,
      title: t("selfCheck.appName"),
      desc: t("selfCheck.confirmWeight", {
        date: isToday(selectedDate) ? t("selfCheck.today") : format(selectedDate, "MMM d"),
      }),
      action: submitWeightLog,
      isAlert: false,
    })
  }

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weightKg) || 60
    const next = Math.round((current + delta) * 10) / 10
    if (next > 0 && next <= 300) setWeightKg(next.toFixed(1))
  }

  async function submitSymptomLog() {
    setConfirmDialog((prev) => ({ ...prev, open: false }))
    setSubmitting(true)

    try {
      const timeTs = isToday(selectedDate)
        ? new Date().toISOString()
        : new Date(format(selectedDate, "yyyy-MM-dd") + "T12:00:00").toISOString()

      const res = await postSymptomLog({
        patientId: patientId!,
        ...symptoms,
        notes: JSON.stringify(symptoms),
        timeTs,
      })

      if ((res as any)?.error) throw new Error((res as any).error)

      toast.success(t("selfCheck.toast.symptomsSaved"))

      const dateStr = format(selectedDate, "yyyy-MM-dd")
      getDailyStatus(patientId!, dateStr).then(setDailyStatus)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || t("selfCheck.toast.symptomsFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogSymptoms = () => {
    if (!patientId) return

    setConfirmDialog({
      open: true,
      title: t("selfCheck.appName"),
      desc: t("selfCheck.confirmSymptoms", {
        date: isToday(selectedDate) ? t("selfCheck.today") : format(selectedDate, "MMM d"),
      }),
      action: submitSymptomLog,
    })
  }

  const handleDateChange = (days: number) => {
    const newDate = addDays(selectedDate, days)
    if (newDate > new Date()) return
    setSelectedDate(newDate)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
      setOcrResult(null)
    }
  }

  const handleScan = async () => {
    if (!selectedImage || !patientId) {
      toast.error(t("selfCheck.toast.identifyUser"))
      return
    }

    setLoadingVitals(true)

    try {
      const result = await processImage(selectedImage, patientId)
      setOcrResult(result)
      toast.success(t("selfCheck.toast.scanComplete"))
      setManualForm({
        sys: result.sys || "",
        dia: result.dia || "",
        pulse: result.pulse || "",
      })

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 100)
    } catch (err: any) {
      toast.error(err.message || t("selfCheck.toast.processImageFailed"))
      setSelectedImage(null)
      setPreviewUrl(null)
      setOcrResult(null)
    } finally {
      setLoadingVitals(false)
    }
  }

  const handleManualSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault()

    if (!patientId) {
      toast.error(t("selfCheck.toast.identifyUser"))
      return
    }

    setLoadingVitals(true)

    try {
      await addManualEvent(
        {
          type: "blood_pressure",
          value1: manualForm.sys,
          value2: manualForm.dia,
          value3: manualForm.pulse,
        },
        patientId
      )

      toast.success(t("selfCheck.toast.bpSaved"))

      try {
        queryClient.invalidateQueries({ queryKey: ["patient-vitals"] })
      } catch (_) {}

      setManualForm({ sys: "", dia: "", pulse: "" })
      setOcrResult(null)
      setSelectedImage(null)
      setPreviewUrl(null)
      fetchEvents()

      const dateStr = format(selectedDate, "yyyy-MM-dd")
      getDailyStatus(patientId, dateStr).then(setDailyStatus)
    } catch (err: any) {
      toast.error(err.message || t("selfCheck.toast.vitalsFailed"))
    } finally {
      setLoadingVitals(false)
    }
  }

  const handleActionClick = (action: "camera" | "upload") => {
    setPendingAction(action)
    setShowInstructions(true)
  }

  const handleContinue = () => {
    setShowInstructions(false)
    if (pendingAction === "camera") {
      startCameraDirectly()
    } else if (pendingAction === "upload") {
      fileInputRef.current?.click()
    }
    setPendingAction(null)
  }

  const startCameraDirectly = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error(t("selfCheck.toast.cameraUnsupported"))
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      setCameraMode(true)
      setOcrResult(null)
    } catch (err: any) {
      console.error("Camera error:", err)
      if (err.name === "NotAllowedError") {
        toast.error(t("selfCheck.toast.cameraDenied"))
      } else if (err.name === "NotFoundError") {
        toast.error(t("selfCheck.toast.cameraNotFound"))
      } else {
        toast.error(t("selfCheck.toast.cameraFailed"))
      }
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraMode(false)
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext("2d")

      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
              if (previewUrl) URL.revokeObjectURL(previewUrl)
              setSelectedImage(file)
              setPreviewUrl(URL.createObjectURL(file))
              stopCamera()
            }
          },
          "image/jpeg",
          0.95
        )
      }
    }
  }

  const extractWeightFromOCR = (result: any): string => {
    if (!result) return ""

    const preferredFields = [
      result.kg,
      result.weight,
      result.weightKg,
      result.detectedWeight,
      result.reading,
      result.value,
      result.value1,
    ]

    for (const item of preferredFields) {
      if (item === null || item === undefined || item === "") continue
      const num = parseFloat(String(item).replace(/[^\d.]/g, ""))
      if (!isNaN(num) && num >= 20 && num <= 300) {
        return num.toFixed(1)
      }
    }

    const textFields = [result.text, result.rawText, result.ocrText, result.detectedText]
      .filter(Boolean)
      .map((v: any) => String(v))

    for (const text of textFields) {
      const cleaned = text.replace(/[Oo]/g, "0").replace(/[Bb]/g, "8").replace(/[Ss]/g, "5")

      const matches = cleaned.match(/\d{2,3}(?:\.\d{1,2})?/g) || []

      const candidates = matches
        .map((m) => parseFloat(m))
        .filter((n) => !isNaN(n) && n >= 20 && n <= 300)

      if (candidates.length > 0) {
        return candidates[0].toFixed(1)
      }
    }

    return ""
  }

  const handleWeightImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (weightPreviewUrl) URL.revokeObjectURL(weightPreviewUrl)
      setSelectedWeightImage(file)
      setWeightPreviewUrl(URL.createObjectURL(file))
      setWeightScanResult(null)
    }
  }

  const handleWeightActionClick = (action: "camera" | "upload") => {
    setPendingWeightAction(action)
    setShowWeightInstructions(true)
  }

  const handleWeightContinue = () => {
    setShowWeightInstructions(false)

    if (pendingWeightAction === "camera") {
      startWeightCamera()
    } else if (pendingWeightAction === "upload") {
      weightFileInputRef.current?.click()
    }

    setPendingWeightAction(null)
  }

  const startWeightCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Camera is not supported on this device.")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      weightStreamRef.current = stream
      setWeightCameraMode(true)
      setWeightScanResult(null)
    } catch (err: any) {
      console.error("Weight camera error:", err)
      toast.error("Unable to open camera.")
    }
  }

  const stopWeightCamera = () => {
    if (weightStreamRef.current) {
      weightStreamRef.current.getTracks().forEach((track) => track.stop())
      weightStreamRef.current = null
    }
    setWeightCameraMode(false)
  }

  const captureWeightPhoto = () => {
    if (weightVideoRef.current) {
      const canvas = document.createElement("canvas")
      canvas.width = weightVideoRef.current.videoWidth
      canvas.height = weightVideoRef.current.videoHeight
      const ctx = canvas.getContext("2d")

      if (ctx) {
        ctx.drawImage(weightVideoRef.current, 0, 0)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], "weight-capture.jpg", { type: "image/jpeg" })
              if (weightPreviewUrl) URL.revokeObjectURL(weightPreviewUrl)
              setSelectedWeightImage(file)
              setWeightPreviewUrl(URL.createObjectURL(file))
              stopWeightCamera()
            }
          },
          "image/jpeg",
          0.95
        )
      }
    }
  }

  const handleWeightScan = async () => {
    if (!selectedWeightImage || !patientId) {
      toast.error("Please select a weight machine photo first.")
      return
    }

    setLoadingWeightScan(true)

    try {
      const result = await processWeightImage(selectedWeightImage, patientId)
      setWeightScanResult(result)

      const detectedWeight = extractWeightFromOCR(result)

      if (detectedWeight) {
        setWeightKg(detectedWeight)
        toast.success(`Weight detected: ${detectedWeight} kg`)
      } else {
        toast.error("Weight not detected clearly. Please retake the photo in a bright place and keep the display straight.")
      }
    } catch (err: any) {
      console.error("Weight scan failed:", err)
      toast.error(err.message || "Failed to scan weight image.")
      setWeightScanResult(null)
    } finally {
      setLoadingWeightScan(false)
    }
  }

  const symptomList = [
    { id: "cough", label: t("selfCheck.symptoms.cough") },
    { id: "breathlessness", label: t("selfCheck.symptoms.breathlessness") },
    { id: "swelling", label: t("selfCheck.symptoms.swelling") },
    { id: "weightGain", label: t("selfCheck.symptoms.weightGain") },
    { id: "abdomen", label: t("selfCheck.symptoms.abdomen") },
    { id: "sleeping", label: t("selfCheck.symptoms.sleeping") },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="mx-auto w-full max-w-6xl">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">{t("selfCheck.title")}</CardTitle>
            <CardDescription className="text-center">{t("selfCheck.description")}</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-6 overflow-x-auto pb-2">
              <div className="flex justify-between gap-2 min-w-max px-1">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date()
                  d.setDate(d.getDate() - (6 - i))
                  return d
                }).map((d) => {
                  const dateStr = format(d, "yyyy-MM-dd")
                  const st = weeklyStatus[dateStr] || { has_weight: false, has_symptoms: false }
                  const isSelected = isSameDay(d, selectedDate)
                  const isDayToday = isToday(d)

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDate(d)}
                      className={cn(
                        "flex min-w-[50px] cursor-pointer flex-col items-center justify-center rounded-lg border p-2 transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-transparent bg-card shadow-sm hover:bg-accent",
                        isDayToday && !isSelected ? "border-dashed border-primary/50" : ""
                      )}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-70">{format(d, "EEE")}</span>
                      <span className="text-lg font-bold leading-none my-1">{format(d, "d")}</span>
                      <div className="flex gap-1">
                        <div
                          className={cn("w-1.5 h-1.5 rounded-full", st.has_weight ? "bg-green-500" : "bg-red-300")}
                          title={t("selfCheck.weightTab")}
                        />
                        <div
                          className={cn("w-1.5 h-1.5 rounded-full", st.has_symptoms ? "bg-green-500" : "bg-red-300")}
                          title={t("selfCheck.symptomsTab")}
                        />
                      </div>
                    </div>
                  )
                })}

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-auto w-12 rounded-lg border-dashed">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-2 flex justify-center gap-4">
                <span className="flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-300 mr-1" />
                  {t("selfCheck.missing")}
                </span>
                <span className="flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
                  {t("selfCheck.completed")}
                </span>
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SelfCheckTab)} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="weight">{t("selfCheck.weightTab")}</TabsTrigger>
                <TabsTrigger value="symptoms">{t("selfCheck.symptomsTab")}</TabsTrigger>
                <TabsTrigger value="vitals">{t("selfCheck.vitalsTab")}</TabsTrigger>
              </TabsList>

              <TabsContent value="weight">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Weight className="w-5 h-5 text-primary" />
                      {t("selfCheck.dailyWeightTitle")}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="space-y-4 rounded-xl border p-4 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Weight Scanner</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Upload or capture a photo of the weight machine display. The detected value will fill in the
                        weight field automatically.
                      </p>

                      {!weightCameraMode ? (
                        <>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                            <input
                              ref={weightFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleWeightImageSelect}
                              className="hidden"
                            />

                            <div
                              onClick={() => handleWeightActionClick("upload")}
                              className="cursor-pointer flex flex-col items-center gap-2"
                            >
                              {weightPreviewUrl ? (
                                <img
                                  src={weightPreviewUrl}
                                  alt="Weight Preview"
                                  className="max-h-64 rounded-lg object-contain"
                                />
                              ) : (
                                <>
                                  <Upload className="w-10 h-10 text-muted-foreground" />
                                  <span className="text-muted-foreground font-medium">
                                    Upload weight machine photo
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={() => handleWeightActionClick("camera")} variant="outline" className="flex-1">
                              <Camera className="w-4 h-4 mr-2" />
                              Use Camera
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="relative border-2 border-muted-foreground/25 rounded-lg overflow-hidden">
                            <video ref={weightVideoRef} autoPlay playsInline className="w-full rounded-lg" />
                            <Button
                              onClick={stopWeightCamera}
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <Button onClick={captureWeightPhoto} className="w-full">
                            <Camera className="w-4 h-4 mr-2" />
                            Capture Weight Photo
                          </Button>
                        </div>
                      )}

                      {selectedWeightImage && (
                        <div className="space-y-2">
                          <Button onClick={handleWeightScan} disabled={loadingWeightScan} className="w-full">
                            {loadingWeightScan ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              "Scan Weight from Photo"
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setSelectedWeightImage(null)
                              setWeightPreviewUrl(null)
                              setWeightScanResult(null)
                            }}
                          >
                            Remove Photo
                          </Button>
                        </div>
                      )}

                      {weightScanResult && (
                        <div className="rounded-lg bg-background border p-4 space-y-3">
                          <div className="text-sm">
                            <span className="font-medium">Detected weight:</span>{" "}
                            <span className="text-primary font-bold">{weightKg ? `${weightKg} kg` : "Not detected"}</span>
                          </div>

                          {weightScanResult.annotatedImage && (
                            <img
                              src={`data:image/jpeg;base64,${weightScanResult.annotatedImage}`}
                              alt="Weight OCR Result"
                              className="rounded-lg max-h-64 object-contain border"
                            />
                          )}

                          <p className="text-xs text-muted-foreground">
                            You can edit the detected value below before saving.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weight">{t("selfCheck.weightLabel")}</Label>
                      <div className="flex gap-3 items-center">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => adjustWeight(-0.1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>

                        <Input
                          id="weight"
                          type="number"
                          placeholder="68.5"
                          className="flex-1 text-center text-lg h-10"
                          step="0.1"
                          min="20"
                          max="300"
                          value={weightKg}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "") {
                              setWeightKg("")
                              return
                            }

                            const num = parseFloat(value)
                            if (!isNaN(num) && num >= 0 && num <= 300) {
                              setWeightKg(value)
                            }
                          }}
                        />

                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => adjustWeight(0.1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("selfCheck.weightHelp")}</p>
                    </div>

                    {dailyStatus.has_weight ? (
                      <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm font-medium">
                        <Activity className="w-4 h-4" />
                        {t("selfCheck.weightLoggedMessage", {
                          date: isToday(selectedDate) ? t("selfCheck.today") : format(selectedDate, "d MMM"),
                        })}
                      </div>
                    ) : (
                      <Button className="w-full" onClick={handleLogWeight} disabled={submitting || !patientId || !weightKg}>
                        {!patientId
                          ? t("selfCheck.loadingPatient")
                          : !weightKg
                            ? t("selfCheck.enterWeight")
                            : submitting
                              ? t("selfCheck.saving")
                              : t("selfCheck.logWeight")}
                      </Button>
                    )}

                    {!patientId && !dailyStatus.has_weight && (
                      <p className="text-xs text-center text-muted-foreground mt-2">{t("selfCheck.fetchingPatient")}</p>
                    )}

                    {!weightKg && patientId && !dailyStatus.has_weight && (
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        {t("selfCheck.enterWeightHint")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="symptoms">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-primary" />
                      {t("selfCheck.symptomsTitle")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{t("selfCheck.symptomsGuide")}</p>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {symptomList.map((symptom) => {
                      const value = symptoms[symptom.id] ?? 0
                      const leftPercent = (value / 5) * 100
                      const color = getSymptomColor(value)

                      return (
                        <div key={symptom.id} className="space-y-3 rounded-xl border p-4 bg-muted/20">
                          <div className="flex items-center justify-between gap-3">
                            <Label htmlFor={symptom.id} className="text-sm font-medium leading-snug">
                              {symptom.label}
                            </Label>

                            <span
                              className="min-w-[72px] rounded-full px-3 py-1 text-center text-sm font-bold text-white"
                              style={{ backgroundColor: color }}
                            >
                              {value}
                            </span>
                          </div>

                          <div className="relative pt-6 pb-2">
                            <div
                              className="absolute left-0 right-0 top-[30px] h-2 rounded-full"
                              style={{
                                background:
                                  "linear-gradient(to right, #22c55e 0%, #84cc16 20%, #eab308 40%, #f59e0b 60%, #f97316 80%, #ef4444 100%)",
                              }}
                            />

                            <div
                              className="absolute top-[22px] h-6 w-6 -translate-x-1/2 rounded-full border-4 border-white shadow-md"
                              style={{
                                left: `${leftPercent}%`,
                                backgroundColor: color,
                              }}
                            />

                            <input
                              id={symptom.id}
                              type="range"
                              min={0}
                              max={5}
                              step={1}
                              value={value}
                              onChange={(e) => {
                                const newValue = Number(e.target.value)
                                setSymptoms((s) => ({ ...s, [symptom.id]: newValue }))
                              }}
                              className="relative z-10 h-8 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent"
                            />
                          </div>

                          <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>0</span>
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                            <span>4</span>
                            <span>5</span>
                          </div>

                          <div className="flex justify-between text-xs">
                            <span className="text-green-600 font-medium">{t("selfCheck.noSymptom")}</span>
                            <span className="text-yellow-600 font-medium">{t("selfCheck.mild")}</span>
                            <span className="text-red-600 font-medium">{t("selfCheck.severe")}</span>
                          </div>

                          <p className="text-xs font-medium" style={{ color }}>
                            Current level: {getSymptomLabel(value)}
                          </p>
                        </div>
                      )
                    })}

                    {dailyStatus.has_symptoms ? (
                      <div className="p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm font-medium">
                        <Activity className="w-4 h-4" />
                        {t("selfCheck.symptomsLoggedMessage", {
                          date: isToday(selectedDate) ? t("selfCheck.today") : format(selectedDate, "d MMM"),
                        })}
                      </div>
                    ) : (
                      <Button className="w-full" onClick={handleLogSymptoms} disabled={submitting || !patientId}>
                        {t("selfCheck.logSymptoms")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vitals">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card className="p-6">
                      <Tabs value={vitalsTab} onValueChange={setVitalsTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                          <TabsTrigger value="scan">{t("selfCheck.scanMonitor")}</TabsTrigger>
                          <TabsTrigger value="manual">{t("selfCheck.manualEntry")}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="scan" className="space-y-6">
                          {!cameraMode ? (
                            <>
                              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageSelect}
                                  className="hidden"
                                  id="image-upload"
                                />
                                <div
                                  onClick={() => handleActionClick("upload")}
                                  className="cursor-pointer flex flex-col items-center gap-2"
                                >
                                  {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg object-contain" />
                                  ) : (
                                    <>
                                      <Upload className="w-12 h-12 text-muted-foreground" />
                                      <span className="text-muted-foreground font-medium">{t("selfCheck.uploadImage")}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button onClick={() => handleActionClick("camera")} variant="outline" className="flex-1">
                                  <Camera className="w-4 h-4 mr-2" />
                                  {t("selfCheck.useCamera")}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-4">
                              <div className="relative border-2 border-muted-foreground/25 rounded-lg overflow-hidden">
                                <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
                                <Button
                                  onClick={stopCamera}
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <Button onClick={capturePhoto} className="w-full">
                                <Camera className="w-4 h-4 mr-2" />
                                {t("selfCheck.capturePhoto")}
                              </Button>
                            </div>
                          )}

                          {selectedImage && (
                            <div className="space-y-2">
                              <Button onClick={handleScan} disabled={loadingVitals} className="w-full">
                                {loadingVitals ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  t("selfCheck.processImage")
                                )}
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedImage(null)
                                  setPreviewUrl(null)
                                  setOcrResult(null)
                                }}
                                variant="outline"
                                className="w-full"
                              >
                                {t("selfCheck.uploadDifferent")}
                              </Button>
                            </div>
                          )}

                          {ocrResult && (
                            <div ref={resultsRef} className="bg-muted/50 p-4 rounded-lg space-y-6">
                              {ocrResult.annotatedImage && (
                                <div className="flex flex-col items-center">
                                  <p className="text-sm text-muted-foreground mb-2 self-start">
                                    {t("selfCheck.annotatedResult")}
                                  </p>
                                  <img
                                    src={`data:image/jpeg;base64,${ocrResult.annotatedImage}`}
                                    alt="Annotated"
                                    className="rounded-lg w-5/12 object-contain shadow-md"
                                  />
                                </div>
                              )}

                              <div className="space-y-4">
                                <div>
                                  <h3 className="font-semibold">{t("selfCheck.verifyEdit")}</h3>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t("selfCheck.recordedAt")}: {new Date().toLocaleDateString()}{" "}
                                    {new Date().toLocaleTimeString()}
                                  </p>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="scan-sys">SYS</Label>
                                    <Input
                                      id="scan-sys"
                                      type="number"
                                      value={manualForm.sys}
                                      onChange={(e) => setManualForm({ ...manualForm, sys: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="scan-dia">DIA</Label>
                                    <Input
                                      id="scan-dia"
                                      type="number"
                                      value={manualForm.dia}
                                      onChange={(e) => setManualForm({ ...manualForm, dia: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="scan-pulse">PULSE</Label>
                                    <Input
                                      id="scan-pulse"
                                      type="number"
                                      value={manualForm.pulse}
                                      onChange={(e) => setManualForm({ ...manualForm, pulse: e.target.value })}
                                    />
                                  </div>
                                </div>

                                <Button onClick={(e) => handleManualSubmit(e)} disabled={loadingVitals} className="w-full">
                                  {loadingVitals ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    t("selfCheck.saveResult")
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="manual">
                          <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("selfCheck.recordingAt")}: {new Date().toLocaleDateString()}{" "}
                                {new Date().toLocaleTimeString()}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="sys">{t("selfCheck.systolic")}</Label>
                                <Input
                                  id="sys"
                                  type="number"
                                  value={manualForm.sys}
                                  onChange={(e) => setManualForm({ ...manualForm, sys: e.target.value })}
                                  placeholder="120"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="dia">{t("selfCheck.diastolic")}</Label>
                                <Input
                                  id="dia"
                                  type="number"
                                  value={manualForm.dia}
                                  onChange={(e) => setManualForm({ ...manualForm, dia: e.target.value })}
                                  placeholder="80"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="pulse">{t("selfCheck.pulse")}</Label>
                                <Input
                                  id="pulse"
                                  type="number"
                                  value={manualForm.pulse}
                                  onChange={(e) => setManualForm({ ...manualForm, pulse: e.target.value })}
                                  placeholder="72"
                                  required
                                />
                              </div>
                            </div>

                            <Button type="submit" disabled={loadingVitals} className="w-full">
                              {loadingVitals ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                t("selfCheck.saveReading")
                              )}
                            </Button>
                          </form>
                        </TabsContent>
                      </Tabs>
                    </Card>
                  </div>

                  <div>
                    <Card className="p-6 h-full">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <History className="w-5 h-5" />
                        {t("selfCheck.recentReadings")}
                      </h3>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {events.length === 0 ? (
                          <p className="text-muted-foreground text-sm">{t("selfCheck.noReadings")}</p>
                        ) : (
                          events.map((event: any) => (
                            <div key={event.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium capitalize">{event.type.replace("_", " ")}</span>
                                <div className="text-xs text-muted-foreground text-right">
                                  <div>{new Date(event.created_at).toLocaleDateString()}</div>
                                  <div>{new Date(event.created_at).toLocaleTimeString()}</div>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground text-xs">SYS</span>
                                  <div className="font-semibold">{event.value_1}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">DIA</span>
                                  <div className="font-semibold">{event.value_2}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">PULSE</span>
                                  <div className="font-semibold">{event.value_3}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Dialog
          open={confirmDialog.open}
          onOpenChange={(o) => setConfirmDialog((prev) => ({ ...prev, open: o }))}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogDescription>{confirmDialog.desc}</DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0">
              {!confirmDialog.isAlert && (
                <Button variant="ghost" onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
                  {t("selfCheck.cancel")}
                </Button>
              )}
              <Button onClick={confirmDialog.action}>
                {confirmDialog.isAlert ? t("selfCheck.ok") : t("selfCheck.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">{t("selfCheck.pictureGuideTitle")}</DialogTitle>
              <DialogDescription>{t("selfCheck.pictureGuideDesc")}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6 my-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t("selfCheck.correct")}</span>
                </div>
                <div className="border-2 border-green-500 dark:border-green-400 rounded-lg overflow-hidden">
                  <img src={correctImage} alt="Correct - Upright monitor" className="w-full h-auto" />
                </div>
                <p className="text-sm text-muted-foreground">{t("selfCheck.correctDesc")}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                  <XCircle className="w-5 h-5" />
                  <span>{t("selfCheck.incorrect")}</span>
                </div>
                <div className="border-2 border-red-500 dark:border-red-400 rounded-lg overflow-hidden">
                  <img src={slantedImage} alt="Incorrect - Slanted monitor" className="w-full h-auto" />
                </div>
                <p className="text-sm text-muted-foreground">{t("selfCheck.incorrectDesc")}</p>
              </div>
            </div>

            <Button onClick={handleContinue} className="w-full">
              {t("selfCheck.gotIt")}
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={showWeightInstructions} onOpenChange={setShowWeightInstructions}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Weight Photo Guide</DialogTitle>
              <DialogDescription>
                Please keep the weighing scale display straight, clear, and bright before scanning.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6 my-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Correct</span>
                </div>
                <div className="border-2 border-green-500 dark:border-green-400 rounded-lg overflow-hidden">
                  <img src={correctImage} alt="Correct example" className="w-full h-auto" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Keep the display flat, bright, and filling most of the frame.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                  <XCircle className="w-5 h-5" />
                  <span>Incorrect</span>
                </div>
                <div className="border-2 border-red-500 dark:border-red-400 rounded-lg overflow-hidden">
                  <img src={slantedImage} alt="Incorrect example" className="w-full h-auto" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Avoid blur, slanted angle, shadow, and glare.
                </p>
              </div>
            </div>

            <Button onClick={handleWeightContinue} className="w-full">
              Got it
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default SelfCheck