import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    const cleanEmail = email.toLowerCase().trim()

    if (cleanEmail === "admintest@gmail.com") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      })

      if (error || !data.user) {
        return NextResponse.json({ success: false, message: "Access Denied: Incorrect password." })
      }

      return NextResponse.json({ 
        success: true, 
        isAdmin: true,
        user: { email: data.user.email }
      })
    }

    const { data: students, error } = await supabase
      .from("authorized_students")
      .select("*")
      .eq("email", cleanEmail)
      .single()

    if (error || !students) {
      return NextResponse.json({ success: false, message: "Access Denied: Email not registered." })
    }

    const isValidPassword = await bcrypt.compare(password, students.password)
    
    if (!isValidPassword) {
      return NextResponse.json({ success: false, message: "Access Denied: Incorrect password." })
    }

    return NextResponse.json({ 
      success: true, 
      isAdmin: false,
      student: {
        email: students.email,
        firstName: students.firstname,
        lastName: students.lastname,
        yearLevel: students.yearlevel,
        block: students.block,
        id: students.id,
        mustchangepassword: students.mustchangepassword
      }
    })

  } catch (error) {
    return NextResponse.json({ success: false, message: "System Error: Unable to connect." })
  }
}