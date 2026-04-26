import { Toaster } from "./components/ui/toaster"
import { Toaster as Sonner } from "./components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { HashRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "next-themes"

import Navigation from "./components/Navigation"
import { LanguageProvider } from "./contexts/LanguageContext"
import ProfileGuard from "./components/ProfileGuard"
import RequireAuth from "./components/RequireAuth"
import RequireAdmin from "./components/RequireAdmin"

import Profile from "./pages/Profile"
import Dashboard from "./pages/Dashboard"
import VitalsTracker from "./pages/VitalsTracker"
import Education from "./pages/Education"
import SelfCheck from "./pages/SelfCheck"
import Exercise from "./pages/Exercise"
import Medication from "./pages/Medication"
import Contact from "./pages/Contact"
import NotFound from "./pages/NotFound"
import Register from "./pages/Register"
import Login from "./pages/Login"
import SymptomChecker from "./pages/SymptomChecker"
import AuthCallback from "./pages/AuthCallback"
import DebugVitals from "./pages/DebugVitals"
import WaterSalt from "./pages/WaterSalt"

import AdminLogin from "./pages/admin/AdminLogin"
import PatientList from "./pages/admin/PatientList"
import PatientDetail from "./pages/admin/PatientDetail"
import AdminDashboard from "./pages/AdminDashboard"
import AdminAlerts from "./pages/admin/AdminAlerts"
import AdminReports from "./pages/admin/AdminReports"
import AdminSettings from "./pages/admin/AdminSettings"

const ENABLE_DEBUG = (import.meta as any).env?.VITE_ENABLE_DEBUG === "1"
const queryClient = new QueryClient()

const protectedPage = (node: React.ReactNode) => (
  <RequireAuth>
    <ProfileGuard>{node}</ProfileGuard>
  </RequireAuth>
)

const adminPage = (node: React.ReactNode) => (
  <RequireAdmin>{node}</RequireAdmin>
)

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <HashRouter>
              <Routes>
                {/* Auth */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Admin */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={adminPage(<AdminDashboard />)} />
                <Route path="/admin/patients" element={adminPage(<PatientList />)} />
                <Route path="/admin/patient/:id" element={adminPage(<PatientDetail />)} />
                <Route path="/admin/alerts" element={adminPage(<AdminAlerts />)} />
                <Route path="/admin/reports" element={adminPage(<AdminReports />)} />
                <Route path="/admin/settings" element={adminPage(<AdminSettings />)} />

                {/* Patient App */}
                <Route element={<Navigation />}>
                  <Route path="/" element={protectedPage(<Dashboard />)} />
                  <Route path="/dashboard" element={protectedPage(<Dashboard />)} />
                  <Route
                    path="/profile"
                    element={
                      <RequireAuth>
                        <Profile />
                      </RequireAuth>
                    }
                  />

                  <Route path="/exercise" element={protectedPage(<Exercise />)} />
                  <Route path="/self-check" element={protectedPage(<SelfCheck />)} />
                  <Route path="/medication" element={protectedPage(<Medication />)} />
                  <Route path="/vitals" element={protectedPage(<VitalsTracker />)} />
                  <Route path="/ai-assistant" element={protectedPage(<SymptomChecker />)} />
                  <Route path="/education" element={protectedPage(<Education />)} />
                  <Route path="/help-support" element={protectedPage(<Contact />)} />
                  <Route path="/contact" element={protectedPage(<Contact />)} />
                  <Route path="/water-salt" element={protectedPage(<WaterSalt />)} />
                  <Route path="/water-diet" element={protectedPage(<WaterSalt />)} />

                  {ENABLE_DEBUG && (
                    <>
                      <Route
                        path="/debug-vitals"
                        element={
                          <RequireAuth>
                            <DebugVitals />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/debug/vitals"
                        element={
                          <RequireAuth>
                            <DebugVitals />
                          </RequireAuth>
                        }
                      />
                    </>
                  )}
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
}

export default App