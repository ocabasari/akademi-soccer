'use client'

import React, { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Login Auth Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError
      const user = authData.user
      if (!user) throw new Error('Gagal mendeteksi user login.')

      // 2. Ambil role dari tabel profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // 3. Arahkan berdasarkan role
      if (profile.role === 'admin' || profile.role === 'pelatih') {
        router.push('/admin/dashboard')
      } else {
        router.push('/siswa/dashboard')
      }

    } catch (error: any) {
      setErrorMsg(error.message || 'Email atau password salah!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6">
        
        {/* LOGO & HEADER */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-blue-50 text-[#1E3A8A] rounded-2xl mx-auto flex items-center justify-center shadow-inner border border-blue-100">
            {/* Ganti tag img di bawah ini jika Anda sudah punya file logo.png di folder public */}
            {/* <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" /> */}
            <div className="w-16 h-16 bg-blue-50 rounded-2xl mx-auto flex items-center justify-center shadow-inner border border-blue-100 overflow-hidden p-2">
  <img 
    src="/logo.png" 
    alt="Logo Akademi" 
    className="w-full h-full object-contain" 
  />
</div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Selamat Datang</h1>
            <p className="text-xs text-gray-500 mt-1">Portal Akademik Academy Soccer Junior</p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-xl text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* FORM LOGIN */}
        <form onSubmit={handleLogin} className="space-y-4 text-sm">
          <div>
            <label className="block text-gray-600 font-medium mb-1">Email Aktif</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
          </div>

          <div>
            <label className="block text-gray-600 font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#1E3A8A] text-white font-bold rounded-xl hover:bg-blue-900 transition shadow-md cursor-pointer mt-2"
          >
            {loading ? 'Memuat...' : 'Masuk ke Portal'}
          </button>
        </form>

        {/* LINK PENDAFTARAN */}
        <div className="pt-4 border-t text-center text-xs text-gray-500 space-y-2">
          <p>Belum terdaftar sebagai siswa?</p>
          <a
            href="/daftar"
            className="inline-block font-semibold text-[#1E3A8A] hover:underline"
          >
            Daftar Siswa Baru Sekarang →
          </a>
        </div>

      </div>
    </main>
  )
}