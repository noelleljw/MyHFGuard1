import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Bell,
  Lock,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  User,
  Database,
} from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export default function AdminSettings() {
  const navigate = useNavigate()

  const [adminName, setAdminName] = useState("")
  const [email, setEmail] = useState("")
  const [role] = useState("Healthcare Provider")
  const [emailAlert, setEmailAlert] = useState(true)

  // 🔐 password
  const [newPassword, setNewPassword] = useState("")
  const [showPasswordBox, setShowPasswordBox] = useState(false)

  // ✅ load real admin info
  useEffect(() => {
    const loadAdmin = async () => {
      const { data } = await supabase.auth.getUser()

      if (data?.user) {
        setAdminName(data.user.email?.split("@")[0] || "Admin")
        setEmail(data.user.email || "")
      }
    }

    loadAdmin()
  }, [])

  const saveSettings = () => {
    toast.success("Settings saved successfully")
  }

  const logout = () => {
    localStorage.removeItem("admin")
    navigate("/admin/login")
  }

  // 🔐 change password
  const changePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    setNewPassword("")
    setShowPasswordBox(false)
    toast.success("Password changed successfully")
  }

  return (
    <div className="min-h-screen bg-[#eef2f7] p-6">
      {/* Back */}
      <button
        onClick={() => navigate("/admin/dashboard")}
        className="mb-5 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        <ArrowLeft size={17} />
        Back to Dashboard
      </button>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Account Settings
        </h1>
        <p className="text-sm text-slate-500">
          Manage admin profile, alerts, security and system information.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Admin Profile */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <User className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-800">Admin Profile</h2>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            This account receives alerts and manages patient monitoring.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-600">Admin Name</label>
              <input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 mt-1"
              />
            </div>

            <div>
              <label className="text-sm text-slate-600">Email Address</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Last login: {new Date().toLocaleString()}
              </p>
            </div>

            <div>
              <label className="text-sm text-slate-600">Role</label>
              <input
                value={role}
                disabled
                className="w-full rounded-lg border bg-slate-100 px-3 py-2 mt-1 text-slate-500"
              />
            </div>
          </div>
        </section>

        {/* Notification */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-800">
              Alert Notification
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between border p-4 rounded-xl">
              <div>
                <p className="font-medium">
                  Email Alert Notification
                </p>
                <p className="text-sm text-slate-500">
                  Send email when patient is warning/critical
                </p>
              </div>

              <button
                onClick={() => setEmailAlert(!emailAlert)}
                className={`px-4 py-2 rounded-full text-sm ${
                  emailAlert
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100"
                }`}
              >
                {emailAlert ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div>
              <label className="text-sm text-slate-600">
                Alert Receiver Email
              </label>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2 mt-1">
                <Mail size={16} />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-800">Security</h2>
          </div>

          <button
            onClick={() => setShowPasswordBox(!showPasswordBox)}
            className="w-full bg-slate-100 py-3 rounded-lg mb-3"
          >
            <Lock size={16} className="inline mr-2" />
            Change Password
          </button>

          {showPasswordBox && (
            <div className="border rounded-xl p-4 space-y-3 bg-slate-50">
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border px-3 py-2 rounded-lg"
              />

              <button
                onClick={changePassword}
                className="w-full bg-blue-600 text-white py-2 rounded-lg"
              >
                Update Password
              </button>
            </div>
          )}

          <button
            onClick={logout}
            className="w-full mt-3 bg-red-50 text-red-600 py-3 rounded-lg"
          >
            <LogOut size={16} className="inline mr-2" />
            Logout
          </button>
        </section>

        {/* System Info */}
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Database className="text-blue-600" size={20} />
            <h2 className="font-bold text-slate-800">
              System Information
            </h2>
          </div>

          <div className="space-y-3">
            <InfoRow label="System Purpose" value="Monitor patient health" />
            <InfoRow label="Data Source" value="Supabase + Smartband + User Input" />
            <InfoRow label="Refresh Rate" value="Every 30 seconds" />
            <InfoRow label="Alert Rules" value="BP, HR, SpO2, Weight" />
          </div>
        </section>
      </div>

      {/* Save */}
      <div className="mt-6 text-right">
        <button
          onClick={saveSettings}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          <Save size={16} className="inline mr-2" />
          Save Settings
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: any) {
  return (
    <div className="flex justify-between bg-slate-50 p-3 rounded-lg">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}