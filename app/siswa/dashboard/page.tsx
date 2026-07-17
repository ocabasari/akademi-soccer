'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

export default function StudentDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  // State Edit Profil & Dokumen
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    nama: '',
    no_hp: '',
    asal_sekolah: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    tinggi_badan: '',
    berat_badan: '',
    ukuran_jersey: 'M',
    no_punggung: '',
    nama_ayah: '',
    pekerjaan_ayah: '',
    nama_ibu: '',
    pekerjaan_ibu: '',
    alamat: ''
  })
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const fetchStudentData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (studentError || !studentData) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile && (profile.role === 'admin' || profile.role === 'pelatih')) {
          router.push('/admin/dashboard')
          return
        }

        throw new Error('Data siswa tidak ditemukan.')
      }

      setStudent(studentData)
      setEditForm({
        nama: studentData.nama || '',
        no_hp: studentData.no_hp || '',
        asal_sekolah: studentData.asal_sekolah || '',
        tempat_lahir: studentData.tempat_lahir || '',
        tanggal_lahir: studentData.tanggal_lahir || '',
        tinggi_badan: studentData.tinggi_badan || '',
        berat_badan: studentData.berat_badan || '',
        ukuran_jersey: studentData.ukuran_jersey || 'M',
        no_punggung: studentData.no_punggung || '',
        nama_ayah: studentData.nama_ayah || '',
        pekerjaan_ayah: studentData.pekerjaan_ayah || '',
        nama_ibu: studentData.nama_ibu || '',
        pekerjaan_ibu: studentData.pekerjaan_ibu || '',
        alamat: studentData.alamat || ''
      })

      const { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentData.id)
        .order('tanggal', { ascending: false })
      setAttendanceList(attData || [])

      const { data: assessData } = await supabase
        .from('student_assessments')
        .select('*')
        .eq('student_id', studentData.id)
        .order('tanggal', { ascending: true })
      setAssessments(assessData || [])

      // Logika Tagihan: Filter hanya tagihan yang bulannya >= tanggal pendaftaran siswa
      const regDate = new Date(studentData.created_at || studentData.tanggal_pendaftaran || Date.now())
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentData.id)
        .order('created_at', { ascending: false })

      // Saring tagihan agar siswa tidak ditagih sebelum tanggal bergabung
      const filteredPayments = (paymentData || []).filter(p => {
        return new Date(p.created_at) >= new Date(regDate.getFullYear(), regDate.getMonth(), 1)
      })
      setPayments(filteredPayments)

    } catch (error: any) {
      console.error('Gagal memuat dashboard:', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudentData()
  }, [router])

  // Helper Hitung Kategori Usia dari Tanggal Lahir
  const getAgeCategory = (tglLahir: string) => {
    if (!tglLahir) return 'Umum'
    const birthYear = new Date(tglLahir).getFullYear()
    const currentYear = new Date().getFullYear()
    const age = currentYear - birthYear
    if (age <= 8) return 'U-8 (Junior)'
    if (age <= 10) return 'U-10'
    if (age <= 12) return 'U-12'
    if (age <= 15) return 'U-15'
    if (age <= 18) return 'U-18'
    return 'Senior / Umum'
  }

  // Upload Berkas (KK, Akta, KIA)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'kk_url' | 'akta_url' | 'kia_url') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${student.id}_${docType}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('student-documents')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('students')
        .update({ [docType]: publicUrl })
        .eq('id', student.id)

      if (updateError) throw updateError

      alert('Berhasil mengunggah dokumen!')
      fetchStudentData()
    } catch (error: any) {
      alert('Gagal upload dokumen: ' + error.message)
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)

    try {
      const { error } = await supabase
        .from('students')
        .update({
          nama: editForm.nama,
          no_hp: editForm.no_hp,
          asal_sekolah: editForm.asal_sekolah,
          tempat_lahir: editForm.tempat_lahir,
          tanggal_lahir: editForm.tanggal_lahir || null,
          tinggi_badan: editForm.tinggi_badan ? Number(editForm.tinggi_badan) : null,
          berat_badan: editForm.berat_badan ? Number(editForm.berat_badan) : null,
          ukuran_jersey: editForm.ukuran_jersey,
          no_punggung: editForm.no_punggung ? Number(editForm.no_punggung) : null,
          nama_ayah: editForm.nama_ayah,
          pekerjaan_ayah: editForm.pekerjaan_ayah,
          nama_ibu: editForm.nama_ibu,
          pekerjaan_ibu: editForm.pekerjaan_ibu,
          alamat: editForm.alamat
        })
        .eq('id', student.id)

      if (error) throw error

      alert('Profil berhasil diperbarui!')
      setIsEditing(false)
      fetchStudentData()
    } catch (error: any) {
      alert('Gagal memperbarui profil: ' + error.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-sm">Memuat dashboard siswa...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-md text-center space-y-3">
          <p className="text-gray-800 font-bold">Akun belum terhubung ke data siswa.</p>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold">Keluar</button>
        </div>
      </div>
    )
  }

  let hadir = 0, izin = 0, sakit = 0, alpha = 0
  attendanceList.forEach(item => {
    if (item.status === 'hadir') hadir++
    if (item.status === 'izin') izin++
    if (item.status === 'sakit') sakit++
    if (item.status === 'alpha') alpha++
  })

  const groupedAssessments: { [aspek: string]: any[] } = {}
  assessments.forEach(item => {
    if (!groupedAssessments[item.aspek]) {
      groupedAssessments[item.aspek] = []
    }
    groupedAssessments[item.aspek].push(item)
  })

  const renderLineChart = (items: any[]) => {
    if (!items || items.length === 0) return null
    const width = 400
    const height = 90
    const padding = 25

    const values = items.map(i => Number(i.nilai) || 0)
    const minVal = Math.min(...values, 0)
    const maxVal = Math.max(...values, 10)
    const range = maxVal - minVal === 0 ? 1 : maxVal - minVal

    const points = items.map((it, idx) => {
      const x = padding + (idx / (items.length === 1 ? 1 : items.length - 1)) * (width - 2 * padding)
      const y = height - padding - ((Number(it.nilai) - minVal) / range) * (height - 2 * padding)
      return { x, y, val: it.nilai, date: it.tanggal }
    })

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')

    return (
      <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Grafik Tren Perkembangan</p>
        <div className="w-full overflow-x-auto flex justify-center">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-sm h-20 overflow-visible">
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e5e7eb" strokeDasharray="3" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeDasharray="3" />

            {points.length > 1 && (
              <polyline
                fill="none"
                stroke="#1E3A8A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
            )}

            {points.map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r="4.5" fill="#1E3A8A" />
                <circle cx={p.x} cy={p.y} r="2" fill="#ffffff" />
                <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[10px] font-bold fill-[#1E3A8A]">
                  {p.val}
                </text>
                <text x={p.x} y={height - 5} textAnchor="middle" className="text-[9px] fill-gray-500">
                  {p.date.split('-').slice(1).join('/')}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    )
  }

  const isAktif = student.status?.toLowerCase() === 'aktif'
  const registrationDate = new Date(student.created_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const ageCategory = getAgeCategory(student.tanggal_lahir)

  return (
    <main className="min-h-screen bg-gray-50 py-6 sm:py-10 px-3 sm:px-4 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-row justify-between items-center gap-3">
          <div className="min-w-0 flex items-center gap-3.5">
            {student.foto_url ? (
              <img src={student.foto_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-[#1E3A8A] shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1E3A8A] flex items-center justify-center font-bold text-lg shrink-0 border border-blue-200">
                {student.nama.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${isAktif ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isAktif ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  Status: {student.status || 'pending'}
                </span>
                <span className="px-2.5 py-0.5 bg-blue-100 text-[#1E3A8A] text-[10px] font-bold rounded-full">
                  Kategori: {ageCategory}
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900 mt-1 truncate">
                Halo, {student.nama}! ⚽
              </h1>
              <p className="text-[11px] text-gray-400">Terdaftar sejak: {registrationDate}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 text-xs sm:text-sm font-medium rounded-xl transition cursor-pointer shrink-0"
          >
            <span>🚪 Keluar</span>
          </button>
        </div>

        {/* 1. KARTU BIODATA PRIBADI & UPLOAD BERKAS (KK, AKTA, KIA) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">👤 Data Pribadi & Dokumen Turnamen</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 bg-blue-50 text-[#1E3A8A] hover:bg-blue-100 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              {isEditing ? 'Batal Edit' : '✏️ Edit Biodata'}
            </button>
          </div>

          {!isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm bg-gray-50 p-4 rounded-xl">
                <div><p className="text-gray-400 text-[10px]">Email Akun</p><p className="font-semibold text-gray-800">{student.email || '-'}</p></div>
                <div><p className="text-gray-400 text-[10px]">No. HP / WhatsApp</p><p className="font-semibold text-gray-800">{student.no_hp || '-'}</p></div>
                <div><p className="text-gray-400 text-[10px]">Asal Sekolah</p><p className="font-semibold text-gray-800">{student.asal_sekolah || '-'}</p></div>
                <div><p className="text-gray-400 text-[10px]">Tempat, Tanggal Lahir</p><p className="font-semibold text-gray-800">{student.tempat_lahir || '-'}{student.tanggal_lahir ? `, ${student.tanggal_lahir}` : ''}</p></div>
                <div><p className="text-gray-400 text-[10px]">Tinggi & Berat Badan</p><p className="font-semibold text-gray-800">{student.tinggi_badan || '-'} cm / {student.berat_badan || '-'} kg</p></div>
                <div><p className="text-gray-400 text-[10px]">Atribut Jersey & Punggung</p><p className="font-semibold text-gray-800">{student.no_punggung ? `#${student.no_punggung}` : '-'} (Ukuran: {student.ukuran_jersey || '-'})</p></div>
                <div><p className="text-gray-400 text-[10px]">Nama Ayah & Pekerjaan</p><p className="font-semibold text-gray-800">{student.nama_ayah || '-'} {student.pekerjaan_ayah ? `(${student.pekerjaan_ayah})` : ''}</p></div>
                <div><p className="text-gray-400 text-[10px]">Nama Ibu & Pekerjaan</p><p className="font-semibold text-gray-800">{student.nama_ibu || '-'} {student.pekerjaan_ibu ? `(${student.pekerjaan_ibu})` : ''}</p></div>
                <div className="sm:col-span-2"><p className="text-gray-400 text-[10px]">Alamat Lengkap</p><p className="font-semibold text-gray-800">{student.alamat || '-'}</p></div>
              </div>

              {/* Status Dokumen Turnamen */}
              <div className="border border-blue-100 bg-blue-50/50 p-4 rounded-xl space-y-3">
                <p className="text-xs font-bold text-[#1E3A8A] uppercase">📁 Kelengkapan Berkas Turnamen (KK / Akta / KIA)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border flex flex-col justify-between gap-2">
                    <div>
                      <span className="font-bold text-gray-800">Kartu Keluarga (KK)</span>
                      <p className="text-[10px] text-gray-400">{student.kk_url ? '✓ Terunggah' : 'Belum ada file'}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {student.kk_url && <a href={student.kk_url} target="_blank" className="px-2 py-1 bg-blue-50 text-[#1E3A8A] font-semibold rounded text-[10px]">Lihat</a>}
                      <label className="px-2 py-1 bg-[#1E3A8A] text-white font-semibold rounded text-[10px] cursor-pointer hover:bg-blue-900">
                        {uploadingDoc ? '...' : 'Upload'}
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'kk_url')} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border flex flex-col justify-between gap-2">
                    <div>
                      <span className="font-bold text-gray-800">Akta Kelahiran</span>
                      <p className="text-[10px] text-gray-400">{student.akta_url ? '✓ Terunggah' : 'Belum ada file'}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {student.akta_url && <a href={student.akta_url} target="_blank" className="px-2 py-1 bg-blue-50 text-[#1E3A8A] font-semibold rounded text-[10px]">Lihat</a>}
                      <label className="px-2 py-1 bg-[#1E3A8A] text-white font-semibold rounded text-[10px] cursor-pointer hover:bg-blue-900">
                        {uploadingDoc ? '...' : 'Upload'}
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'akta_url')} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border flex flex-col justify-between gap-2">
                    <div>
                      <span className="font-bold text-gray-800">KIA / Kartu Identitas</span>
                      <p className="text-[10px] text-gray-400">{student.kia_url ? '✓ Terunggah' : 'Belum ada file'}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {student.kia_url && <a href={student.kia_url} target="_blank" className="px-2 py-1 bg-blue-50 text-[#1E3A8A] font-semibold rounded text-[10px]">Lihat</a>}
                      <label className="px-2 py-1 bg-[#1E3A8A] text-white font-semibold rounded text-[10px] cursor-pointer hover:bg-blue-900">
                        {uploadingDoc ? '...' : 'Upload'}
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'kia_url')} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Nama Lengkap</label>
                  <input type="text" value={editForm.nama} onChange={(e) => setEditForm({...editForm, nama: e.target.value})} required className="w-full px-3 py-2 border rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">No. HP / WhatsApp</label>
                  <input type="text" value={editForm.no_hp} onChange={(e) => setEditForm({...editForm, no_hp: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Asal Sekolah</label>
                  <input type="text" value={editForm.asal_sekolah} onChange={(e) => setEditForm({...editForm, asal_sekolah: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Tempat Lahir</label>
                  <input type="text" value={editForm.tempat_lahir} onChange={(e) => setEditForm({...editForm, tempat_lahir: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                  <input type="date" value={editForm.tanggal_lahir} onChange={(e) => setEditForm({...editForm, tanggal_lahir: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Ukuran Jersey</label>
                  <select value={editForm.ukuran_jersey} onChange={(e) => setEditForm({...editForm, ukuran_jersey: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white">
                    <option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Tinggi Badan (cm)</label>
                  <input type="number" value={editForm.tinggi_badan} onChange={(e) => setEditForm({...editForm, tinggi_badan: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Berat Badan (kg)</label>
                  <input type="number" value={editForm.berat_badan} onChange={(e) => setEditForm({...editForm, berat_badan: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">No. Punggung Pilihan</label>
                  <input type="number" value={editForm.no_punggung} onChange={(e) => setEditForm({...editForm, no_punggung: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Nama Ayah & Pekerjaan</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nama Ayah" value={editForm.nama_ayah} onChange={(e) => setEditForm({...editForm, nama_ayah: e.target.value})} className="px-3 py-2 border rounded-xl bg-white" />
                    <input type="text" placeholder="Pekerjaan" value={editForm.pekerjaan_ayah} onChange={(e) => setEditForm({...editForm, pekerjaan_ayah: e.target.value})} className="px-3 py-2 border rounded-xl bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Nama Ibu & Pekerjaan</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Nama Ibu" value={editForm.nama_ibu} onChange={(e) => setEditForm({...editForm, nama_ibu: e.target.value})} className="px-3 py-2 border rounded-xl bg-white" />
                    <input type="text" placeholder="Pekerjaan" value={editForm.pekerjaan_ibu} onChange={(e) => setEditForm({...editForm, pekerjaan_ibu: e.target.value})} className="px-3 py-2 border rounded-xl bg-white" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-gray-700 mb-1">Alamat Lengkap</label>
                  <textarea rows={2} value={editForm.alamat} onChange={(e) => setEditForm({...editForm, alamat: e.target.value})} className="w-full px-3 py-2 border rounded-xl bg-white" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl">Batal</button>
                <button type="submit" disabled={savingProfile} className="px-5 py-2 bg-[#1E3A8A] text-white font-semibold rounded-xl shadow-sm">{savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          )}
        </div>

        {/* 2. KARTU REKAPITULASI KEHADIRAN */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">📋 Rekapitulasi Kehadiran Latihan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-green-50 p-3 rounded-2xl border border-green-200">
              <p className="text-[11px] font-semibold text-green-800 uppercase">Hadir</p>
              <p className="text-xl font-extrabold text-green-700 mt-1">{hadir} <span className="text-xs font-normal">sesi</span></p>
            </div>
            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200">
              <p className="text-[11px] font-semibold text-blue-800 uppercase">Izin</p>
              <p className="text-xl font-extrabold text-blue-700 mt-1">{izin} <span className="text-xs font-normal">sesi</span></p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-200">
              <p className="text-[11px] font-semibold text-yellow-800 uppercase">Sakit</p>
              <p className="text-xl font-extrabold text-yellow-700 mt-1">{sakit} <span className="text-xs font-normal">sesi</span></p>
            </div>
            <div className="bg-red-50 p-3 rounded-2xl border border-red-200">
              <p className="text-[11px] font-semibold text-red-800 uppercase">Alpha</p>
              <p className="text-xl font-extrabold text-red-700 mt-1">{alpha} <span className="text-xs font-normal">sesi</span></p>
            </div>
          </div>
        </div>

        {/* 3. GRAFIK & HASIL ASESMEN LATIHAN */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">📈 Grafik & Hasil Asesmen Latihan</h2>

          {Object.keys(groupedAssessments).length === 0 ? (
            <p className="text-center py-6 text-gray-400 italic text-xs">Belum ada data asesmen angka yang diinput oleh pelatih.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(groupedAssessments).map(([aspekName, items]) => (
                <div key={aspekName} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wide">⚽ {aspekName}</h3>
                    <span className="text-[10px] bg-blue-100 text-[#1E3A8A] font-semibold px-2 py-0.5 rounded-full">
                      Tes: {items.length}x
                    </span>
                  </div>

                  <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 uppercase text-[9px] border-b">
                          <th className="py-2 px-2.5">Tanggal</th>
                          <th className="py-2 px-2.5 text-center">Nilai</th>
                          <th className="py-2 px-2.5">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-800">
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-2.5 font-medium text-gray-600">{it.tanggal}</td>
                            <td className="py-2 px-2.5 text-center font-bold text-[#1E3A8A]">{it.nilai}</td>
                            <td className="py-2 px-2.5 text-gray-500 truncate max-w-[120px]">{it.catatan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {renderLineChart(items)}

                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. STATUS TAGIHAN & PEMBAYARAN (DENGAN TOMBOL LIHAT INVOICE) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">💳 Riwayat Tagihan & Pembayaran</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider border-b text-[11px]">
                  <th className="py-3 px-4">Jenis Tagihan</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi / Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-gray-400">Belum ada tagihan tercatat.</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-4 font-semibold text-gray-900">{p.bulan}</td>
                      <td className="py-3 px-4 font-medium text-gray-800">Rp {Number(p.jumlah).toLocaleString('id-ID')}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${p.status === 'lunas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.status === 'lunas' ? (
                          <button
                            onClick={() => setSelectedInvoice(p)}
                            className="px-3 py-1 bg-blue-50 text-[#1E3A8A] hover:bg-blue-100 font-semibold text-xs rounded-lg transition cursor-pointer"
                          >
                            📄 Lihat Invoice
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* --- MODAL INVOICE PEMBAYARAN DIGITAL --- */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="text-center border-b pb-4 space-y-1">
              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2.5 py-0.5 rounded-full uppercase">Bukti Pembayaran Lunas</span>
              <h3 className="text-lg font-bold text-gray-900">Academy Soccer Junior</h3>
              <p className="text-[11px] text-gray-500">Kwitansi Pembayaran Resmi</p>
            </div>

            <div className="space-y-2 text-xs sm:text-sm bg-gray-50 p-4 rounded-2xl">
              <div className="flex justify-between"><span className="text-gray-500">Nama Siswa:</span><span className="font-semibold text-gray-900">{student.nama}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Jenis Iuran:</span><span className="font-semibold text-gray-900">{selectedInvoice.bulan}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Nominal:</span><span className="font-bold text-green-600">Rp {Number(selectedInvoice.jumlah).toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tanggal:</span><span className="font-semibold text-gray-900">{new Date(selectedInvoice.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="font-bold text-green-700 uppercase">LUNAS ✓</span></div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                🖨️ Cetak
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}