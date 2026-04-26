import { Moon, Sun } from "lucide-react"
import * as React from "react"
import { useTheme } from "next-themes"

const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const toggleTheme = () => setTheme(isDark ? "light" : "dark")
  return (
    <button
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center rounded-full p-3 bg-muted text-foreground shadow-lg hover:bg-muted/80 ${className || ''}`}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}

export default ThemeToggle