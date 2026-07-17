'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function RaporSiswaPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string

  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<any>(null)
  const [attendanceSummary, setAttendanceSummary] = useState({ hadir: 0, izin: 0, sakit: 0, alpha: 0 })
  const [assessments, setAssessments] = useState<any[]>([])

  const fetchRaporData = async () => {
    try {
      // 1. Ambil data siswa
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError
      setStudent(studentData)

      // 2. Ambil data absensi
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)

      if (!attError && attData) {
        let h = 0, i = 0, s = 0, a = 0
        attData.forEach((item: any) => {
          if (item.status === 'hadir') h++
          if (item.status === 'izin') i++
          if (item.status === 'sakit') s++
          if (item.status === 'alpha') a++
        })
        setAttendanceSummary({ hadir: h, izin: i, sakit: s, alpha: a })
      }

      // 3. Ambil data asesmen siswa diurutkan berdasarkan tanggal
      const { data: assessData, error: assessError } = await supabase
        .from('student_assessments')
        .select('*')
        .eq('student_id', studentId)
        .order('tanggal', { ascending: true })

      if (!assessError) {
        setAssessments(assessData || [])
      }

    } catch (error) {
      console.error('Gagal memuat rapor:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentId) fetchRaporData()
  }, [studentId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-sm">Menyiapkan dokumen rapor...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-lg font-bold text-gray-800">Data siswa tidak ditemukan.</p>
          <button onClick={() => router.back()} className="px-4 py-2 bg-[#1E3A8A] text-white rounded-xl text-xs font-semibold">← Kembali</button>
        </div>
      </div>
    )
  }

  // Kelompokkan asesmen berdasarkan aspek (misal: Juggling, Passing)
  const groupedAssessments: { [aspek: string]: any[] } = {}
  assessments.forEach(item => {
    if (!groupedAssessments[item.aspek]) {
      groupedAssessments[item.aspek] = []
    }
    groupedAssessments[item.aspek].push(item)
  })

  // Helper untuk merender grafik garis kompak (SVG Line Chart)
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
      <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1">
        <p className="text-[10px] font-bold text-gray-500 uppercase">Grafik Garis Peningkatan</p>
        <div className="w-full overflow-x-auto flex justify-center">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xs h-20 overflow-visible">
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

  return (
    <main className="min-h-screen bg-gray-100 py-4 px-3">
      
      {/* CSS Khusus Cetak A4 & Margin Presisi (Atas 1cm, Kanan 2cm, Bawah 1cm, Kiri 1cm) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm 2cm 1cm 1cm;
          }
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
          }
          .rapor-container {
            max-width: 100% !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .assessment-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Kontrol Navigasi & Print (Hilang saat diprint) */}
      <div className="max-w-3xl mx-auto mb-4 flex justify-between items-center print:hidden">
        <button
          onClick={() => router.back()}
          className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl shadow-xs hover:bg-gray-50 cursor-pointer"
        >
          ← Kembali ke Dashboard
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
        >
          <span>🖨️ Cetak / Simpan ke PDF (A4)</span>
        </button>
      </div>

      {/* LEMBAR RAPOR UTAMA */}
      <div className="rapor-container max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-200 space-y-5">
        
        {/* KOP RAPOR */}
        <div className="text-center border-b border-gray-900 pb-4 space-y-1">
          <div className="w-10 h-10 bg-blue-50 rounded-xl mx-auto flex items-center justify-center border border-blue-200 p-1.5 overflow-hidden print:border-gray-400">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-wider text-gray-900">Academy Soccer Junior</h1>
            <p className="text-[11px] text-gray-500 font-medium">Laporan Hasil Perkembangan & Rekapitulasi Latihan Siswa</p>
          </div>
        </div>

        {/* IDENTITAS SISWA */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center bg-gray-50 p-4 rounded-2xl border border-gray-200 print:bg-white print:border-gray-400">
          <div className="flex justify-center sm:justify-start">
            {student.foto_url ? (
              <img src={student.foto_url} alt={student.nama} className="w-20 h-20 rounded-xl object-cover border-2 border-[#1E3A8A] shadow-sm" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gray-200 text-gray-400 flex items-center justify-center font-bold text-xl border-2 border-gray-300">
                {student.nama.charAt(0)}
              </div>
            )}
          </div>
          <div className="sm:col-span-3 grid grid-cols-2 gap-1.5 text-xs">
            <div><span className="text-gray-400 block text-[10px]">Nama Lengkap:</span><span className="font-bold text-gray-900">{student.nama}</span></div>
            <div><span className="text-gray-400 block text-[10px]">Asal Sekolah:</span><span className="font-semibold text-gray-800">{student.asal_sekolah || '-'}</span></div>
            <div><span className="text-gray-400 block text-[10px]">Tempat, Tgl Lahir:</span><span className="font-semibold text-gray-800">{student.tempat_lahir || '-'}{student.tanggal_lahir ? `, ${student.tanggal_lahir}` : ''}</span></div>
            <div><span className="text-gray-400 block text-[10px]">Atribut Jersey:</span><span className="font-semibold text-gray-800">{student.no_punggung ? `#${student.no_punggung}` : '-'} (Ukuran: {student.ukuran_jersey || '-'})</span></div>
            <div className="col-span-2"><span className="text-gray-400 block text-[10px]">Orang Tua (Ayah / Ibu):</span><span className="font-semibold text-gray-800">{student.nama_ayah || '-'} / {student.nama_ibu || '-'}</span></div>
          </div>
        </div>

        {/* REKAPITULASI KEHADIRAN */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b pb-1">I. Rekapitulasi Kehadiran Latihan</h2>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-green-50 p-2 rounded-xl border border-green-200 print:border-gray-300">
              <p className="text-[10px] font-semibold text-green-800 uppercase">Hadir</p>
              <p className="text-base font-extrabold text-green-700">{attendanceSummary.hadir} <span className="text-[10px] font-normal">sesi</span></p>
            </div>
            <div className="bg-blue-50 p-2 rounded-xl border border-blue-200 print:border-gray-300">
              <p className="text-[10px] font-semibold text-blue-800 uppercase">Izin</p>
              <p className="text-base font-extrabold text-blue-700">{attendanceSummary.izin} <span className="text-[10px] font-normal">sesi</span></p>
            </div>
            <div className="bg-yellow-50 p-2 rounded-xl border border-yellow-200 print:border-gray-300">
              <p className="text-[10px] font-semibold text-yellow-800 uppercase">Sakit</p>
              <p className="text-base font-extrabold text-yellow-700">{attendanceSummary.sakit} <span className="text-[10px] font-normal">sesi</span></p>
            </div>
            <div className="bg-red-50 p-2 rounded-xl border border-red-200 print:border-gray-300">
              <p className="text-[10px] font-semibold text-red-800 uppercase">Alpha</p>
              <p className="text-base font-extrabold text-red-700">{attendanceSummary.alpha} <span className="text-[10px] font-normal">sesi</span></p>
            </div>
          </div>
        </div>

        {/* HASIL ASESMEN & GRAFIK (BERDAMPINGAN / GRID KECIL AGAR MUAT 1 HALAMAN) */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b pb-1">II. Perkembangan Asesmen & Grafik Latihan</h2>

          {Object.keys(groupedAssessments).length === 0 ? (
            <p className="text-center py-4 text-gray-400 italic text-xs">Belum ada data asesmen angka yang tercatat untuk siswa ini.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(groupedAssessments).map(([aspekName, items]) => (
                <div key={aspekName} className="assessment-block bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2.5 print:bg-white print:border-gray-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wide">⚽ {aspekName}</h3>
                    <span className="text-[10px] bg-blue-100 text-[#1E3A8A] font-semibold px-2 py-0.5 rounded-full">
                      Tes: {items.length}x
                    </span>
                  </div>

                  {/* TABEL HISTORIS KOMPAK */}
                  <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 print:border-gray-300">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 uppercase text-[9px] border-b print:bg-gray-200">
                          <th className="py-1.5 px-2">Tanggal</th>
                          <th className="py-1.5 px-2 text-center">Nilai</th>
                          <th className="py-1.5 px-2">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-800">
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2 font-medium text-gray-600">{it.tanggal}</td>
                            <td className="py-1.5 px-2 text-center font-bold text-[#1E3A8A]">{it.nilai}</td>
                            <td className="py-1.5 px-2 text-gray-500 truncate max-w-[100px]">{it.catatan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* GRAFIK GARIS KECIL */}
                  {renderLineChart(items)}

                </div>
              ))}
            </div>
          )}
        </div>

        {/* TANDA TANGAN */}
        <div className="assessment-block pt-6 grid grid-cols-2 gap-6 text-center text-xs">
          <div className="space-y-12">
            <p className="font-semibold text-gray-600 text-[11px]">Mengetahui Orang Tua / Wali</p>
            <p className="font-bold text-gray-900 underline">( {student.nama_ayah || student.nama_ibu || '........................'} )</p>
          </div>
          <div className="space-y-12">
            <p className="font-semibold text-gray-600 text-[11px]">Pelatih Kepala / Head Coach</p>
            <p className="font-bold text-gray-900 underline">( Tim Pelatih Academy Soccer )</p>
          </div>
        </div>

      </div>

    </main>
  )
}