import { useMemo, useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Stethoscope,
  Droplets,
  BookOpen,
  LifeBuoy,
  User,
  Dumbbell,
  Bot,
  Pill,
  PanelRightClose,
  PanelRightOpen,
  LogOut,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import LanguageToggle from "@/components/LanguageToggle"
import { cn } from "@/lib/utils"
import BackToDashboard from "@/components/BackToDashboard"
import { supabase } from "@/lib/supabase"
import logoImg from "@/assets/loginlogo.jpg"

const navItems = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/education", labelKey: "nav.education", icon: BookOpen },
  { to: "/self-check", labelKey: "nav.selfCheck", icon: Stethoscope },
  { to: "/water-salt", labelKey: "nav.waterDiet", icon: Droplets },
  { to: "/exercise", labelKey: "nav.exercise", icon: Dumbbell },
  { to: "/medication", labelKey: "nav.medication", icon: Pill },
  { to: "/ai-assistant", labelKey: "nav.aiAssistant", icon: Bot },
  { to: "/help-support", labelKey: "nav.helpSupport", icon: LifeBuoy },
]

export default function Navigation() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const isDashboard =
    location.pathname === "/" || location.pathname.startsWith("/dashboard")

  const pageTitle = useMemo(() => {
    const current = navItems.find((item) => location.pathname.startsWith(item.to))
    return current ? t(current.labelKey) : t("common.appName")
  }, [location.pathname, t])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Logout failed:", error.message)
      return
    }

    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b bg-background px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white p-2 shadow-sm border border-slate-200">
            <img
              src={logoImg}
              alt="HFGuard Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-primary">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {t("common.welcomeToMyHFGuard", "Heart failure self-care management")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-accent"
            aria-label={sidebarOpen ? t("common.close") : t("common.openMenu", "Open menu")}
            title={sidebarOpen ? t("common.close") : t("common.openMenu", "Open menu")}
          >
            {sidebarOpen ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelRightOpen className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-81px)]">
        <main className="flex-1 p-4 md:p-6">
          {!isDashboard && (
            <div className="mb-4">
              <BackToDashboard />
            </div>
          )}
          <Outlet />
        </main>

        {sidebarOpen && (
          <aside className="flex w-72 flex-col border-l bg-card p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t("nav.menu", "Menu")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("nav.quickAccess", "Quick access")}
              </p>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                        "hover:bg-primary/10 hover:text-primary",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground"
                      )
                    }
                  >
                    <Icon className="h-5 w-5" />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                )
              })}
            </nav>

            <div className="mt-auto pt-4">
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                    "hover:bg-primary/10 hover:text-primary",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground"
                  )
                }
              >
                <User className="h-5 w-5" />
                <span>{t("nav.profile", "Profile")}</span>
              </NavLink>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition-all hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-5 w-5" />
                <span>{t("nav.logout", "Logout")}</span>
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}