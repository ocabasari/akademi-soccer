'use client'

import React, { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DaftarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    no_hp: '',
    asal_sekolah: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    tinggi_badan: '',
    berat_badan: '',
    ukuran_jersey: 'M',
    no_punggung: '',
    nama_ayah: '',
    nama_ibu: '',
    alamat: '',
    metode_pembayaran: 'lunas', // 'lunas', 'cicil', atau 'nanti'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError
      const userId = authData.user?.id
      if (!userId) throw new Error('Gagal mendapatkan ID User')

      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: userId,
          nama: formData.nama,
          email: formData.email,
          role: 'siswa',
          no_hp: formData.no_hp,
        }
      ])
      if (profileError) throw profileError

      let fotoUrl = null
      if (fotoFile) {
        const fileExt = fotoFile.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const filePath = `foto-siswa/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('students')
          .upload(filePath, fotoFile)

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('students')
            .getPublicUrl(filePath)
          fotoUrl = publicUrl
        }
      }

      // Status siswa baru mendaftar selalu 'pending'
      const { data: studentRecord, error: studentError } = await supabase.from('students').insert([
        {
          user_id: userId,
          nama: formData.nama,
          email: formData.email,
          no_hp: formData.no_hp,
          asal_sekolah: formData.asal_sekolah,
          tempat_lahir: formData.tempat_lahir,
          tanggal_lahir: formData.tanggal_lahir || null,
          tinggi_badan: formData.tinggi_badan ? Number(formData.tinggi_badan) : null,
          berat_badan: formData.berat_badan ? Number(formData.berat_badan) : null,
          ukuran_jersey: formData.ukuran_jersey,
          no_punggung: formData.no_punggung ? Number(formData.no_punggung) : null,
          nama_ayah: formData.nama_ayah,
          nama_ibu: formData.nama_ibu,
          alamat: formData.alamat,
          foto_url: fotoUrl,
          status: 'pending',
        }
      ]).select().single()

      if (studentError) throw studentError

      // Logika Tagihan Pendaftaran
      let ketPembayaran = 'Biaya Pendaftaran (Lunas - Rp 600.000)'
      let jumlahTagihan = 600000

      if (formData.metode_pembayaran === 'cicil') {
        ketPembayaran = 'Biaya Pendaftaran (Termin 1 - Rp 300.000)'
        jumlahTagihan = 300000
      } else if (formData.metode_pembayaran === 'nanti') {
        ketPembayaran = 'Biaya Pendaftaran (Belum Dibayar)'
        jumlahTagihan = 600000
      }

      // Status keuangan pendaftaran selalu 'belum lunas' saat pertama mendaftar
      const { error: paymentError } = await supabase.from('payments').insert([
        {
          student_id: studentRecord.id,
          bulan: ketPembayaran,
          jumlah: jumlahTagihan,
          status: 'belum lunas'
        }
      ])

      if (paymentError) throw paymentError

      setShowSuccessModal(true)

    } catch (error: any) {
      alert('Terjadi kesalahan: ' + (error.message || error))
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 relative">
      <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-gray-100">
        
        {/* Tombol Kembali */}
        <div className="mb-6">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 transition shadow-xs"
          >
            ← Kembali ke Login
          </a>
        </div>

        {/* LOGO & HEADER */}
        <div className="text-center mb-8 space-y-3">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl mx-auto flex items-center justify-center shadow-inner border border-blue-100 overflow-hidden p-2">
            <img 
              src="/logo.png" 
              alt="Logo Akademi" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A8A]">Pendaftaran Siswa Baru</h1>
            <p className="text-gray-500 text-xs mt-1">Academy Soccer Junior</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. INPUT FOTO PROFIL (OPSIONAL) */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
            <label className="block text-sm font-bold text-gray-800">Pasfoto / Foto Diri (Opsional)</label>
            <p className="text-xs text-gray-500">Bisa diupload dari galeri atau kamera HP. (Bisa dilewati & diupload nanti di dashboard)</p>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1E3A8A] hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          {/* 2. INPUT DATA DIRI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Nama Lengkap Anak</label>
              <input type="text" name="nama" required value={formData.nama} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="Nama lengkap" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Asal Sekolah</label>
              <input type="text" name="asal_sekolah" value={formData.asal_sekolah} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="Nama Sekolah" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Email Aktif (Untuk Login)</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="email@domain.com" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Password Akun</label>
              <input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="••••••••" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">No. HP / WhatsApp Wali</label>
              <input type="text" name="no_hp" value={formData.no_hp} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="08xxxxxxxxxx" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Ukuran Jersey</label>
              <select name="ukuran_jersey" value={formData.ukuran_jersey} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none bg-white">
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Tempat Lahir</label>
              <input type="text" name="tempat_lahir" value={formData.tempat_lahir} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="Kota Kelahiran" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Tanggal Lahir</label>
              <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none bg-white" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Tinggi Badan (cm)</label>
              <input type="number" name="tinggi_badan" value={formData.tinggi_badan} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="Contoh: 120" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Berat Badan (kg)</label>
              <input type="number" name="berat_badan" value={formData.berat_badan} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="Contoh: 25" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">No. Punggung Pilihan</label>
              <input type="number" name="no_punggung" value={formData.no_punggung} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="Contoh: 10" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Nama Ayah</label>
              <input type="text" name="nama_ayah" value={formData.nama_ayah} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="Nama Ayah" />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Nama Ibu</label>
              <input type="text" name="nama_ibu" value={formData.nama_ibu} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="Nama Ibu" />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-gray-700 mb-1">Alamat Lengkap</label>
              <textarea name="alamat" rows={2} value={formData.alamat} onChange={handleChange} className="w-full px-3.5 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#1E3A8A] outline-none" placeholder="Alamat rumah..." />
            </div>
          </div>

          {/* 3. PILIHAN METODE PEMBAYARAN (3 OPSI) */}
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
            <label className="block text-sm font-bold text-[#1E3A8A]">Pilihan Pembayaran Pendaftaran (Total: Rp 600.000)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${formData.metode_pembayaran === 'lunas' ? 'border-[#1E3A8A] bg-blue-50 font-semibold' : 'border-gray-200 bg-white'}`}>
                <input 
                  type="radio" 
                  name="metode_pembayaran" 
                  value="lunas" 
                  checked={formData.metode_pembayaran === 'lunas'}
                  onChange={handleChange}
                  className="text-[#1E3A8A]"
                />
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Bayar Lunas</p>
                  <p className="text-gray-500">Rp 600.000</p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${formData.metode_pembayaran === 'cicil' ? 'border-[#1E3A8A] bg-blue-50 font-semibold' : 'border-gray-200 bg-white'}`}>
                <input 
                  type="radio" 
                  name="metode_pembayaran" 
                  value="cicil" 
                  checked={formData.metode_pembayaran === 'cicil'}
                  onChange={handleChange}
                  className="text-[#1E3A8A]"
                />
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Cicil (Termin 1)</p>
                  <p className="text-gray-500">Rp 300.000</p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${formData.metode_pembayaran === 'nanti' ? 'border-[#1E3A8A] bg-blue-50 font-semibold' : 'border-gray-200 bg-white'}`}>
                <input 
                  type="radio" 
                  name="metode_pembayaran" 
                  value="nanti" 
                  checked={formData.metode_pembayaran === 'nanti'}
                  onChange={handleChange}
                  className="text-[#1E3A8A]"
                />
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Bayar Nanti</p>
                  <p className="text-gray-500">Bayar menyusul</p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-md cursor-pointer mt-4"
          >
            {loading ? 'Mengirim Pendaftaran...' : 'Kirim Pendaftaran Online'}
          </button>
        </form>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-5 border border-gray-100">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
              🎉
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Pendaftaran Berhasil Dikirim!</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Akun Anda telah terdaftar dengan status <strong className="text-yellow-600">Pending (Belum Aktif)</strong>. Tagihan pendaftaran telah dicatat dengan status <strong className="text-red-600">Belum Lunas</strong>.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl text-left text-xs space-y-1.5 border border-gray-100">
              <p className="text-gray-500">Status Akun: <span className="font-semibold text-yellow-600 uppercase">Pending</span></p>
              <p className="text-gray-500">Status Keuangan: <span className="font-semibold text-red-600 uppercase">Belum Lunas</span></p>
              <p className="text-gray-500">Metode Pilihan: <span className="font-semibold text-gray-800 uppercase">{formData.metode_pembayaran}</span></p>
            </div>

            <button
              onClick={() => router.push('/login')}
              className="w-full py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-2xl shadow-lg transition cursor-pointer"
            >
              Lanjut ke Halaman Login
            </button>
          </div>
        </div>
      )}
    </main>
  )
}