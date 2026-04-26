import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      const { data } = await supabase.auth.getSession();

      const user = data?.session?.user;
      const role = user?.app_metadata?.role;

      if (!mounted) return;

      setAllowed(!!user && role === "admin");
      setLoading(false);
    }

    checkAdmin();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const role = session?.user?.app_metadata?.role;

        if (!mounted) return;

        setAllowed(!!session && role === "admin");
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="p-6 text-slate-600">Checking admin access...</div>;
  }

  if (!allowed) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}