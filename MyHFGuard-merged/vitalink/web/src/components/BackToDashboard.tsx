import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

const BackToDashboard = () => {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <button
      onClick={() => navigate("/")}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
    >
      <ArrowLeft className="w-4 h-4" />
      {t("backToDashboard")}
    </button>
  )
}

export default BackToDashboard