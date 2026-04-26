require('dotenv').config(); // Defaults to .env in current dir
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role to create tables

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
CREATE TABLE IF NOT EXISTS public.health_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  event_type text NOT NULL, -- Medicine, Symptom, Exercise, Diet, Note
  event_time timestamptz NOT NULL,
  description text,
  severity integer, -- 1-5
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  PRIMARY KEY (id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_health_events_patient'
    ) THEN
        ALTER TABLE public.health_events
        ADD CONSTRAINT fk_health_events_patient FOREIGN KEY (patient_id) REFERENCES public.patients(patient_id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_health_events_patient_time ON public.health_events(patient_id, event_time);
`;

async function runMigration() {
    console.log('Running migration...');
    // Supabase-js doesn't support raw SQL execution directly via client unless using rpc or if it's exposed.
    // However, if we don't have direct SQL access, we might struggle.
    // BUT, usually the postgres connection string is available or we can use the dashboard.
    // Since I cannot access the dashboard, and maybe I cannot run raw SQL via supabase-js client without a specific function.
    
    // Check if we can use the 'rpc' to run SQL? No, usually not.
    // Wait, if I'm in the dev environment, maybe I can assume the table exists or I have to ask the user.
    // BUT, for now, I will try to use the REST API to check if I can insert into the table. If not, it fails.
    
    // Actually, I'll try to just log the SQL and tell the user to run it if I can't.
    // But wait, the environment might have a postgres client installed?
    // Let's check package.json of server.
    
    console.log('---------------------------------------------------');
    console.log('PLEASE RUN THIS SQL IN YOUR SUPABASE SQL EDITOR:');
    console.log(sql);
    console.log('---------------------------------------------------');
}

runMigration();
