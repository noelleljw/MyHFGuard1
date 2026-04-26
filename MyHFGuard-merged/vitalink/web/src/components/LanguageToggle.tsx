import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import i18n from "@/lib/i18n"

export default function LanguageToggle() {
  const [lang, setLang] = useState(i18n.language || localStorage.getItem("lang") || "en")

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => setLang(lng)
    i18n.on("languageChanged", handleLanguageChanged)
    return () => i18n.off("languageChanged", handleLanguageChanged)
  }, [])

  const changeLanguage = async (newLang: "en" | "ms") => {
    await i18n.changeLanguage(newLang)
    localStorage.setItem("lang", newLang)
    localStorage.setItem("appLanguage", newLang === "ms" ? "BM" : "BI")
    window.dispatchEvent(new CustomEvent("app-language-sync", { detail: newLang }))
    setLang(newLang)
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant={lang === "en" ? "default" : "outline"} size="sm" onClick={() => changeLanguage("en")}>
        EN
      </Button>
      <Button type="button" variant={lang === "ms" ? "default" : "outline"} size="sm" onClick={() => changeLanguage("ms")}>
        BM
      </Button>
    </div>
  )
}
