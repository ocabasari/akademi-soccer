import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { studentId, userId, newEmail } = await request.json()

    if (!studentId || !userId || !newEmail) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 })
    }

    // Update email di Supabase Auth dan langsung set email_confirm: true agar langsung aktif
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        email: newEmail,
        email_confirm: true 
      }
    )

    if (authError) throw authError

    // Update email di tabel public.students
    const { error: studentError } = await supabaseAdmin
      .from('students')
      .update({ email: newEmail })
      .eq('id', studentId)

    if (studentError) throw studentError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}