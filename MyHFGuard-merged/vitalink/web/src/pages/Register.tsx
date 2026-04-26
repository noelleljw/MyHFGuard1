import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Stethoscope, HeartPulse, UserPlus } from "lucide-react";

import logoImg from "@/assets/loginlogo.jpg";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { serverUrl } from "@/lib/api";
import { toast } from "sonner";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const email = formData.email.trim().toLowerCase();
    const password = formData.password.trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
        },
      },
    });

    if (error) {
      setError(error.message);
      setIsSubmitting(false);
      return;
    }

    const API = serverUrl();
    const userId = data?.user?.id || null;

    try {
      if (userId) {
        await fetch(`${API}/admin/ensure-patient`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: userId,
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth,
          }),
        });
      }

      await fetch(`${API}/admin/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "patient" }),
      });
    } catch (_) {}

    toast.success("Account created. Please check your email to confirm.");
    setIsSubmitting(false);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-[32px] border border-slate-200 dark:border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.45)] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_40%)]" />

          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-md border border-white/20">
              <HeartPulse className="w-7 h-7" />
              <span className="text-xl font-semibold">HFGuard</span>
            </div>

            <h2 className="text-4xl font-bold leading-tight mb-4">
              Create your heart care account
            </h2>
            <p className="text-lg text-white/90 leading-8 max-w-xl">
              Register to start tracking your health, managing reminders, and
              staying connected with your daily heart failure care tools.
            </p>
          </div>

          <div className="relative z-10 space-y-4 mt-10">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
              <ShieldCheck className="w-6 h-6" />
              <span className="text-base">Secure patient account registration</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/10">
              <Stethoscope className="w-6 h-6" />
              <span className="text-base">Set up your care journey with HFGuard</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex items-center justify-center p-6 md:p-10 bg-white/70 dark:bg-slate-950/50">
          <Card className="w-full max-w-md border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 shadow-none rounded-[28px] backdrop-blur-md">
            <CardHeader className="space-y-4 pt-8">
              <div className="flex justify-end">
                <Link
                  to="/login"
                  className="text-sm text-sky-600 dark:text-cyan-300 hover:text-sky-500 dark:hover:text-cyan-200 font-medium"
                >
                  Back to Login
                </Link>
              </div>

              <div className="flex justify-center">
                <div className="rounded-3xl bg-white p-4 shadow-lg border border-slate-200">
                  <img
                    src={logoImg}
                    alt="HFGuard Logo"
                    className="h-16 md:h-20 w-auto object-contain"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 dark:bg-cyan-500/10 px-4 py-2 text-cyan-700 dark:text-cyan-300 text-sm font-medium">
                  <UserPlus className="w-4 h-4" />
                  New Patient Registration
                </div>
              </div>

              <CardTitle className="text-4xl font-bold text-center text-slate-900 dark:text-white">
                Create account
              </CardTitle>
              <CardDescription className="text-center text-base text-slate-600 dark:text-slate-300">
                Enter your details to register with HFGuard
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-2">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-slate-800 dark:text-white">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="h-12 rounded-2xl border-slate-300 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus-visible:ring-cyan-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-slate-800 dark:text-white">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="h-12 rounded-2xl border-slate-300 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus-visible:ring-cyan-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth" className="text-slate-800 dark:text-white">
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-2xl border-slate-300 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white focus-visible:ring-cyan-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-800 dark:text-white">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-2xl border-slate-300 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus-visible:ring-cyan-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-800 dark:text-white">
                    Password
                  </Label>
                  <PasswordInput
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="h-12 rounded-2xl border-slate-300 dark:border-white/10 bg-white dark:bg-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus-visible:ring-cyan-400"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-300 dark:border-red-400/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-200">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl text-base font-semibold bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating account..." : "Register"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center pb-8">
              <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-sky-600 dark:text-cyan-300 hover:text-sky-500 dark:hover:text-cyan-200 font-semibold"
                >
                  Login
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;