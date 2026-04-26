import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  Send,
  Bot,
  User,
  AlertCircle,
  Sparkles,
  Pill,
  Activity,
} from "lucide-react"
import { serverUrl } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Markdown from "react-markdown"
import { useLanguage } from "@/contexts/LanguageContext"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

type PatientSummary = {
  full_name?: string | null
  systolic_bp?: number | null
  diastolic_bp?: number | null
  heart_rate?: number | null
  current_medication?: string | null
}

export default function SymptomChecker() {
  const { t } = useLanguage()

  const getText = (key: string, fallback: string) =>
    t(key) !== key ? t(key) : fallback

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      const userId = data?.session?.user?.id
      if (!userId) return

      setPatientId(userId)

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, systolic_bp, diastolic_bp, heart_rate, current_medication")
        .eq("user_id", userId)
        .maybeSingle()

      if (profileData) {
        setPatientSummary(profileData)
      }

      setMessages([
        {
          id: "1",
          role: "assistant",
          content: getText(
            "myChatWelcome",
            "Hello! I'm your MyHFGuard AI Chat Assistant. I can help answer questions based on your symptoms, reminders, medication and health data.\n\n**Important:** I am not a doctor and cannot diagnose conditions. If you have chest pain, severe breathing difficulty, or stroke symptoms, please seek emergency help immediately.\n\nHow can I help you today?"
          ),
          timestamp: new Date().toISOString(),
        },
      ])

      try {
        const res = await fetch(`${serverUrl()}/health`)
        if (!res.ok) throw new Error(String(res.status))
        console.log("[My Chat] backend health ok")
      } catch (e) {
        console.error("[My Chat] backend health failed", e)
        toast.error("Server connectivity issue")
      }
    }

    init()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!input.trim() || !patientId || loading) {
      if (!patientId) {
        toast.error(getText("userNotFound", "Unable to identify user. Please log in again."))
      }
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch(`${serverUrl()}/api/chat/symptoms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          patientId,
        }),
      })

      let data: any = null

      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        const errMsg =
          data?.details ||
          data?.error ||
          `AI request failed: ${res.status}`

        throw new Error(errMsg)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          data?.response ||
          data?.reply ||
          data?.message ||
          getText(
            "aiFallbackError",
            "I'm sorry, I encountered an error processing your request. Please try again."
          ),
        timestamp: data?.timestamp || new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      console.error("[My Chat] AI failed:", err)
      toast.error(err?.message || getText("aiResponseFailed", "Failed to get response. Please try again."))

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `AI error: ${err?.message || "Unknown error"}`,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const suggestedQuestions = [
    getText("chatPromptVitals", "What do my recent vitals indicate?"),
    getText("chatPromptBreathless", "I'm feeling short of breath, what should I do?"),
    getText("chatPromptMedication", "What medicine do I need to take tonight?"),
    getText("chatPromptDoctor", "What signs mean I should call my doctor?"),
  ]

  const meds =
    patientSummary?.current_medication
      ?.split(/\n|,|;/)
      .map((m) => m.trim())
      .filter(Boolean) || []

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 h-screen flex flex-col">
      <div className="mb-4">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          {getText("myChatTitle", "My Chat")}
        </h2>
        <p className="text-muted-foreground">
          {getText(
            "myChatDesc",
            "Chat with AI assistant for support, guidance and heart health questions."
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        <Card className="min-h-0 shadow-md">
          <CardHeader>
            <CardTitle>{getText("patientSummary", "Patient Summary")}</CardTitle>
            <CardDescription>
              {getText("patientSummaryDesc", "Basic data used to support AI responses")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="border p-3 rounded-xl">
              <p className="text-xs text-muted-foreground">{getText("fullName", "Full Name")}</p>
              <p className="font-medium mt-1">{patientSummary?.full_name || "-"}</p>
            </div>

            <div className="border p-3 rounded-xl">
              <p className="font-medium flex gap-2 items-center mb-2">
                <Activity className="w-4 h-4" />
                {getText("latestVitals", "Latest Vitals")}
              </p>
              <p className="text-sm">
                {getText("bloodPressure", "Blood Pressure")}:{" "}
                {patientSummary?.systolic_bp && patientSummary?.diastolic_bp
                  ? `${patientSummary.systolic_bp}/${patientSummary.diastolic_bp}`
                  : "-"}
              </p>
              <p className="text-sm mt-1">
                {getText("heartRate", "Heart Rate")}:{" "}
                {patientSummary?.heart_rate ? `${patientSummary.heart_rate} bpm` : "-"}
              </p>
            </div>

            <div className="border p-3 rounded-xl">
              <p className="font-medium flex gap-2 items-center mb-2">
                <Pill className="w-4 h-4" />
                {getText("currentMedication", "Current Medication")}
              </p>

              {meds.length > 0 ? (
                <div className="space-y-2">
                  {meds.map((m, i) => (
                    <div key={i} className="text-sm rounded-lg bg-muted/40 px-3 py-2">
                      {m}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {getText("noMedicationFound", "No medication found.")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-0 overflow-hidden shadow-md">
          <CardHeader>
            <CardTitle>{getText("chatWithAssistant", "Chat with AI Assistant")}</CardTitle>
            <CardDescription>
              {getText(
                "chatWithAssistantDesc",
                "Ask about symptoms, reminders, medication, vitals or general health guidance."
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted/50 border rounded-bl-none"
                    }`}
                  >
                    <div className="markdown prose prose-sm dark:prose-invert max-w-none break-words [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4">
                      <Markdown>{m.content}</Markdown>
                    </div>
                    <p
                      className={`text-[10px] mt-1 text-right ${
                        m.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {m.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start w-full animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-none p-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {getText("aiAnalyzing", "Analyzing your health data...")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {messages.length === 1 && (
              <div className="p-3 border-t">
                <p className="text-xs mb-2">
                  {getText("suggestedQuestions", "Suggested Questions")}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInput(q)}
                      className="border rounded-xl px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-t border-b border-amber-100 dark:border-amber-900/50 flex justify-center">
              <div className="flex items-center gap-1.5 text-center">
                <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300">
                  {getText(
                    "aiMedicalDisclaimer",
                    "AI provides information, not diagnosis. Consult a doctor for medical advice."
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={getText("chatInputPlaceholder", "Type your question here...")}
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}