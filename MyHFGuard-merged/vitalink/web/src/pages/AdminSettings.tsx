import { useNavigate } from "react-router-dom"

export default function AdminSettings() {
  const navigate = useNavigate()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Account Settings</h1>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div>
          <p className="text-sm text-slate-500">Admin Name</p>
          <p className="font-medium">Admin User</p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Email</p>
          <p className="font-medium">myhfguard.host@gmail.com</p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Role</p>
          <p className="font-medium">Healthcare Provider</p>
        </div>

        <button
          onClick={() => alert("Change password later")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Change Password
        </button>

        <button
          onClick={() => navigate("/admin/dashboard")}
          className="bg-gray-200 px-4 py-2 rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}