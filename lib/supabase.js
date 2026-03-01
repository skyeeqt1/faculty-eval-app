import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ffxfyekaagynkczlrrct.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeGZ5ZWthYWd5bmtjemxycmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTEzNjIsImV4cCI6MjA4NjI4NzM2Mn0.dvJQcYn3BjXomka6XEJn9a5gQAivgvzOb4ugxZZ0Qcs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For database operations - exports
export const db = supabase
export const auth = supabase.auth
