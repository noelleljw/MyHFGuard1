import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  Siren,
  FileBarChart2,
  Settings,
  LogOut,
} from "lucide-react"

export default function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem("admin")
    navigate("/admin/login")
  }

  const navItems = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Patient List",
      path: "/admin/patients",
      icon: Users,
    },
    {
      label: "Alert Center",
      path: "/admin/alerts",
      icon: Siren,
    },
    {
      label: "Analytics & Reports",
      path: "/admin/reports",
      icon: FileBarChart2,
    },
    {
      label: "Account Settings",
      path: "/admin/settings",
      icon: Settings,
    },
  ]

  return (
    <aside className="hidden lg:flex w-56 flex-col bg-white border-r border-slate-200 text-slate-700">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="text-xl font-bold text-slate-900">MyHFGuard</div>
        <p className="text-xs text-slate-500 mt-1">Admin Dashboard</p>
      </div>

      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto p-3 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  )
}