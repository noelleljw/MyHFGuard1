import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { serverUrl } from '../lib/api'

export default function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    const h = window.location.hash.replace(/^#/, '')
    const p = new URLSearchParams(h)
    const at = p.get('access_token')
    const rt = p.get('refresh_token')
    async function run() {
      try {
        if (at && rt && supabase.auth && supabase.auth.setSession) {
          await supabase.auth.setSession({ access_token: at, refresh_token: rt })
        }
        const { data } = await supabase.auth.getSession()
        const user = data?.session?.user
        const id = user?.id
        const email = user?.email
        const meta = user?.user_metadata || {}
        if (id) {
          try {
            await fetch(`${serverUrl()}/admin/ensure-patient`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ patientId: id, firstName: meta.firstName, lastName: meta.lastName, dateOfBirth: meta.dateOfBirth }),
            })
          } catch (_) {}
          try {
            await fetch(`${serverUrl()}/admin/promote`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email || meta.email || '', role: 'patient' }),
            })
          } catch (_) {}
        }
      } catch (_) {}
      navigate('/')
    }
    run()
  }, [navigate])
  return (<div>Signing you in...</div>)
}
