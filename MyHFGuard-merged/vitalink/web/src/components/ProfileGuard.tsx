import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

type ProfileGuardProps = {
  children: React.ReactNode
}

const ProfileGuard = ({ children }: ProfileGuardProps) => {
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const user = sessionData.session?.user

        if (!user) {
          setCompleted(false)
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("profile_completed")
          .eq("user_id", user.id)
          .maybeSingle()

        if (error) {
          console.error("Profile check error:", error)
          setCompleted(false)
        } else {
          setCompleted(!!data?.profile_completed)

          // still keep localStorage as backup (optional)
          if (data?.profile_completed) {
            localStorage.setItem("profileCompleted", "true")
          }
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        setCompleted(false)
      } finally {
        setLoading(false)
      }
    }

    checkProfile()
  }, [])

  // 🔄 loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Checking profile...
      </div>
    )
  }

  // redirect if not completed
  if (!completed) {
    return <Navigate to="/profile" replace />
  }

  return <>{children}</>
}

export default ProfileGuard