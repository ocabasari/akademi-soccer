'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'students' | 'coaches' | 'attendance' | 'assessments' | 'finance'>('students')
  const [students, setStudents] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [feeTypes, setFeeTypes] = useState<any[]>([])
  const [assessmentTypes, setAssessmentTypes] = useState<any[]>([])
  const [adminName, setAdminName] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)

  // State untuk Mode Edit Siswa di Modal Detail
  const [isEditingStudent, setIsEditingStudent] = useState(false)
  const [editStudentForm, setEditStudentForm] = useState<any>({})

  // State Master Pelatih & Absensi Pelatih
  const [coachForm, setCoachForm] = useState({ nama: '', no_hp: '', gaji_per_sesi: '100000' })
  const [coachAttendanceDate, setCoachAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [coachAttendanceMap, setCoachAttendanceMap] = useState<{ [coachId: string]: string }>({})
  const [coachAttendanceList, setCoachAttendanceList] = useState<any[]>([])
  const [savingCoachAtt, setSavingCoachAtt] = useState(false)

  // Sub-menu untuk Keuangan & Kas ('report' atau 'master_fees')
  const [financeSubTab, setFinanceSubTab] = useState<'report' | 'master_fees'>('report')

  // State Filter, Pencarian, & Pagination Siswa (Buku Induk)
  const [studentSearch, setStudentSearch] = useState('')
  const [studentStatusFilter, setStudentStatusFilter] = useState('all')
  const [studentSortBy, setStudentSortBy] = useState<'oldest' | 'newest' | 'name'>('oldest')
  const [rowsLimit, setRowsLimit] = useState<number>(10)

  // State Filter & Limit untuk Menu Keuangan
  const [paymentSearch, setPaymentSearch] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [paymentRowsLimit, setPaymentRowsLimit] = useState<number>(10)
  const [expenseRowsLimit, setExpenseRowsLimit] = useState<number>(10)

  // State untuk Absensi Siswa
  const [attendanceSubTab, setAttendanceSubTab] = useState<'input' | 'report'>('input')
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [attendanceMap, setAttendanceMap] = useState<{ [studentId: string]: string }>({})
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [savingAttendance, setSavingAttendance] = useState(false)

  const [attSearch, setAttSearch] = useState('')
  const [attStatusFilter, setAttStatusFilter] = useState('all')
  const [reportSearch, setReportSearch] = useState('')

  const [reportFilter, setReportFilter] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  // State untuk Asesmen Massal
  const [assessmentSubTab, setAssessmentSubTab] = useState<'input' | 'master'>('input')
  const [assessDate, setAssessDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedAspek, setSelectedAspek] = useState<string>('')
  const [assessScoresMap, setAssessScoresMap] = useState<{ [studentId: string]: { nilai: string, catatan: string } }>({})
  const [assessSearch, setAssessSearch] = useState('')
  const [savingAssess, setSavingAssess] = useState(false)

  const [feeForm, setFeeForm] = useState({
    nama_biaya: '',
    nominal: '150000',
    kategori: 'pendaftaran'
  })

  const [assessmentForm, setAssessmentForm] = useState({
    nama_aspek: '',
    kategori: 'teknik'
  })

  const [expenseModal, setExpenseModal] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    keterangan: '',
    jumlah: ''
  })

  const [financePaymentModal, setFinancePaymentModal] = useState(false)
  const [financeForm, setFinanceForm] = useState({
    studentId: '',
    feeTypeId: ''
  })

  const [selectedFilterFeeId, setSelectedFilterFeeId] = useState<string>('all')

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'success' | 'danger' | 'info'
    onConfirm?: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  })

  const fetchData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || (profile.role !== 'admin' && profile.role !== 'pelatih')) {
        setModalConfig({
          isOpen: true,
          title: 'Akses Ditolak',
          message: 'Halaman ini khusus untuk Admin / Pelatih.',
          type: 'danger',
          onConfirm: () => router.push('/siswa/dashboard')
        })
        return
      }

      setAdminName(profile.nama || 'Admin')

      const { data: studentList } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: true })
      setStudents(studentList || [])

      const { data: coachList } = await supabase
        .from('coaches')
        .select('*')
        .order('created_at', { ascending: true })
      setCoaches(coachList || [])

      const { data: paymentList } = await supabase
        .from('payments')
        .select('*, students(nama), fee_types(nama_biaya, nominal)')
        .order('created_at', { ascending: false })
      setPayments(paymentList || [])

      const { data: expenseList } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
      setExpenses(expenseList || [])

      const { data: feeList } = await supabase
        .from('fee_types')
        .select('*')
        .order('created_at', { ascending: true })
      setFeeTypes(feeList || [])

      const { data: assessTypeList } = await supabase
        .from('assessment_types')
        .select('*')
        .order('created_at', { ascending: true })
      setAssessmentTypes(assessTypeList || [])
      
      if (assessTypeList && assessTypeList.length > 0 && !selectedAspek) {
        setSelectedAspek(assessTypeList[0].nama_aspek)
      }
      
      if (feeList && feeList.length > 0 && selectedFilterFeeId === 'all') {
        setSelectedFilterFeeId(feeList[0].id)
      }

      fetchAttendanceReportData()
      fetchCoachAttendanceReport()

    } catch (error) {
      console.error('Gagal memuat data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceByDate = async (dateStr: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('tanggal', dateStr)

      if (error) throw error

      const map: { [studentId: string]: string } = {}
      data?.forEach((item: any) => {
        map[item.student_id] = item.status
      })
      setAttendanceMap(map)
    } catch (error) {
      console.error('Gagal memuat absensi tanggal ini:', error)
    }
  }

  const fetchCoachAttendanceByDate = async (dateStr: string) => {
    try {
      const { data, error } = await supabase
        .from('coach_attendance')
        .select('*')
        .eq('tanggal', dateStr)

      if (error) throw error

      const map: { [coachId: string]: string } = {}
      data?.forEach((item: any) => {
        map[item.coach_id] = item.status
      })
      setCoachAttendanceMap(map)
    } catch (error) {
      console.error('Gagal memuat absensi pelatih:', error)
    }
  }

  const fetchAssessmentsByDateAndAspek = async (dateStr: string, aspekName: string) => {
    if (!aspekName) return
    try {
      const { data, error } = await supabase
        .from('student_assessments')
        .select('*')
        .eq('tanggal', dateStr)
        .eq('aspek', aspekName)

      if (error) throw error

      const map: { [studentId: string]: { nilai: string, catatan: string } } = {}
      data?.forEach((item: any) => {
        map[item.student_id] = { nilai: String(item.nilai), catatan: item.catatan || '' }
      })
      setAssessScoresMap(map)
    } catch (error) {
      console.error('Gagal memuat data asesmen:', error)
    }
  }

  const fetchAttendanceReportData = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, students(nama, asal_sekolah, foto_url)')
        .order('tanggal', { ascending: false })

      if (error) throw error
      setAttendanceList(data || [])
    } catch (error) {
      console.error('Gagal memuat rekap absen:', error)
    }
  }

  const fetchCoachAttendanceReport = async () => {
    try {
      const { data, error } = await supabase
        .from('coach_attendance')
        .select('*, coaches(nama, no_hp, gaji_per_sesi)')
        .order('tanggal', { ascending: false })

      if (error) throw error
      setCoachAttendanceList(data || [])
    } catch (error) {
      console.error('Gagal memuat rekap absen pelatih:', error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [router])

  useEffect(() => {
    if (attendanceDate) {
      fetchAttendanceByDate(attendanceDate)
    }
  }, [attendanceDate])

  useEffect(() => {
    if (coachAttendanceDate) {
      fetchCoachAttendanceByDate(coachAttendanceDate)
    }
  }, [coachAttendanceDate])

  useEffect(() => {
    if (assessDate && selectedAspek) {
      fetchAssessmentsByDateAndAspek(assessDate, selectedAspek)
    }
  }, [assessDate, selectedAspek])

  const handleSaveAllAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attendanceDate) return
    setSavingAttendance(true)

    try {
      const recordsToUpsert = Object.entries(attendanceMap)
        .filter(([_, status]) => status && status !== '')
        .map(([studentId, status]) => ({
          student_id: studentId,
          tanggal: attendanceDate,
          status: status
        }))

      if (recordsToUpsert.length === 0) {
        setModalConfig({ isOpen: true, title: 'Perhatian', message: 'Belum ada status kehadiran siswa yang dipilih.', type: 'info' })
        setSavingAttendance(false)
        return
      }

      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToUpsert, { onConflict: 'student_id, tanggal' })

      if (error) throw error

      setModalConfig({
        isOpen: true,
        title: 'Berhasil Disimpan',
        message: `Absensi latihan tanggal ${attendanceDate} berhasil disimpan!`,
        type: 'success'
      })
      fetchAttendanceReportData()
    } catch (error: any) {
      setModalConfig({
        isOpen: true,
        title: 'Gagal Menyimpan',
        message: 'Terjadi kesalahan: ' + error.message,
        type: 'danger'
      })
    } finally {
      setSavingAttendance(false)
    }
  }

  const handleSaveCoachAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coachAttendanceDate) return
    setSavingCoachAtt(true)

    try {
      const recordsToUpsert = Object.entries(coachAttendanceMap)
        .filter(([_, status]) => status && status !== '')
        .map(([coachId, status]) => ({
          coach_id: coachId,
          tanggal: coachAttendanceDate,
          status: status
        }))

      if (recordsToUpsert.length === 0) {
        setModalConfig({ isOpen: true, title: 'Perhatian', message: 'Belum ada status kehadiran pelatih yang dipilih.', type: 'info' })
        setSavingCoachAtt(false)
        return
      }

      const { error } = await supabase
        .from('coach_attendance')
        .upsert(recordsToUpsert, { onConflict: 'coach_id, tanggal' })

      if (error) throw error

      setModalConfig({
        isOpen: true,
        title: 'Berhasil Disimpan',
        message: `Absensi pelatih tanggal ${coachAttendanceDate} berhasil disimpan!`,
        type: 'success'
      })
      fetchCoachAttendanceReport()
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'Gagal Menyimpan', message: 'Terjadi kesalahan: ' + error.message, type: 'danger' })
    } finally {
      setSavingCoachAtt(false)
    }
  }

  const handleAddCoach = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('coaches').insert([{
        nama: coachForm.nama,
        no_hp: coachForm.no_hp,
        gaji_per_sesi: Number(coachForm.gaji_per_sesi) || 0
      }])
      if (error) throw error
      setCoachForm({ nama: '', no_hp: '', gaji_per_sesi: '100000' })
      setModalConfig({ isOpen: true, title: 'Berhasil', message: 'Data pelatih baru berhasil ditambahkan!', type: 'success' })
      fetchData()
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal menambah pelatih: ' + error.message, type: 'danger' })
    }
  }

  const handleDeleteCoach = (id: string, nama: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Pelatih',
      message: `Yakin ingin menghapus pelatih "${nama}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('coaches').delete().eq('id', id)
          if (error) throw error
          fetchData()
          setModalConfig({ isOpen: true, title: 'Berhasil', message: 'Pelatih berhasil dihapus.', type: 'success' })
        } catch (error: any) {
          setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal menghapus: ' + error.message, type: 'danger' })
        }
      }
    })
  }

  const handleSaveAllAssessments = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAspek || !assessDate) return
    setSavingAssess(true)

    try {
      const recordsToUpsert = Object.entries(assessScoresMap)
        .filter(([_, data]) => data.nilai !== '' && data.nilai !== null && data.nilai !== undefined)
        .map(([studentId, data]) => ({
          student_id: studentId,
          aspek: selectedAspek,
          tanggal: assessDate,
          nilai: Number(data.nilai) || 0,
          catatan: data.catatan || ''
        }))

      if (recordsToUpsert.length === 0) {
        setModalConfig({ isOpen: true, title: 'Perhatian', message: 'Belum ada nilai yang diisi untuk disimpan.', type: 'info' })
        setSavingAssess(false)
        return
      }

      const { error } = await supabase
        .from('student_assessments')
        .upsert(recordsToUpsert, { onConflict: 'student_id, aspek, tanggal' })

      if (error) throw error

      setModalConfig({
        isOpen: true,
        title: 'Berhasil Disimpan',
        message: `Nilai asesmen "${selectedAspek}" untuk tanggal ${assessDate} berhasil disimpan!`,
        type: 'success'
      })
      fetchAssessmentsByDateAndAspek(assessDate, selectedAspek)
    } catch (error: any) {
      setModalConfig({
        isOpen: true,
        title: 'Gagal Menyimpan',
        message: 'Terjadi kesalahan: ' + error.message,
        type: 'danger'
      })
    } finally {
      setSavingAssess(false)
    }
  }

  const totalPemasukan = payments
    .filter(p => p.status === 'lunas')
    .reduce((acc, curr) => acc + Number(curr.jumlah), 0)

  const totalPengeluaran = expenses
    .reduce((acc, curr) => acc + Number(curr.jumlah), 0)

  const saldoBersih = totalPemasukan - totalPengeluaran

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: newStatus })
        .eq('id', id)
      if (error) throw error
      setStudents(students.map(s => s.id === id ? { ...s, status: newStatus } : s))
      setModalConfig({ isOpen: true, title: 'Berhasil', message: `Status akun siswa diubah menjadi ${newStatus}.`, type: 'success' })
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal mengubah status: ' + error.message, type: 'danger' })
    }
  }

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editStudentForm.id) return

    try {
      const { error } = await supabase
        .from('students')
        .update({
          nama: editStudentForm.nama,
          email: editStudentForm.email,
          no_hp: editStudentForm.no_hp,
          asal_sekolah: editStudentForm.asal_sekolah,
          tempat_lahir: editStudentForm.tempat_lahir,
          tanggal_lahir: editStudentForm.tanggal_lahir,
          tinggi_badan: editStudentForm.tinggi_badan ? Number(editStudentForm.tinggi_badan) : null,
          berat_badan: editStudentForm.berat_badan ? Number(editStudentForm.berat_badan) : null,
          no_punggung: editStudentForm.no_punggung ? Number(editStudentForm.no_punggung) : null,
          ukuran_jersey: editStudentForm.ukuran_jersey,
          nama_ayah: editStudentForm.nama_ayah,
          pekerjaan_ayah: editStudentForm.pekerjaan_ayah,
          nama_ibu: editStudentForm.nama_ibu,
          pekerjaan_ibu: editStudentForm.pekerjaan_ibu,
          alamat: editStudentForm.alamat,
          status: editStudentForm.status
        })
        .eq('id', editStudentForm.id)

      if (error) throw error

      setStudents(students.map(s => s.id === editStudentForm.id ? { ...editStudentForm } : s))
      setSelectedStudent(editStudentForm)
      setIsEditingStudent(false)
      setModalConfig({
        isOpen: true,
        title: 'Berhasil Diperbarui',
        message: 'Data siswa berhasil diperbarui!',
        type: 'success'
      })
    } catch (error: any) {
      setModalConfig({
        isOpen: true,
        title: 'Gagal Menyimpan',
        message: 'Terjadi kesalahan: ' + error.message,
        type: 'danger'
      })
    }
  }

  const handleUpdatePayment = async (paymentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', paymentId)
      if (error) throw error
      setPayments(payments.map((p: any) => p.id === paymentId ? { ...p, status: newStatus } : p))
      setModalConfig({ isOpen: true, title: 'Berhasil', message: `Status pembayaran diperbarui menjadi ${newStatus}.`, type: 'success' })
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal memperbarui: ' + error.message, type: 'danger' })
    }
  }

  const handleDeletePayment = (paymentId: string, ket: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Konfirmasi Hapus',
      message: `Yakin ingin menghapus catatan transaksi pemasukan "${ket}" ini?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('payments').delete().eq('id', paymentId)
          if (error) throw error
          setPayments(payments.filter(p => p.id !== paymentId))
          setModalConfig({ isOpen: true, title: 'Berhasil', message: 'Transaksi berhasil dihapus.', type: 'success' })
        } catch (error: any) {
          setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal menghapus: ' + error.message, type: 'danger' })
        }
      }
    })
  }

  // --- VALIDASI PEMBATASAN PEMBAYARAN (1X PER BULAN/TAGIHAN, KECUALI PENDAFTARAN) ---
  const handleSaveFinancePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!financeForm.studentId || !financeForm.feeTypeId) return

    const selectedStudentObj = students.find(s => s.id === financeForm.studentId)
    const selectedFeeObj = feeTypes.find(f => f.id === financeForm.feeTypeId)
    if (!selectedStudentObj || !selectedFeeObj) return

    try {
      const isPendaftaran = selectedFeeObj.kategori?.toLowerCase() === 'pendaftaran'

      // Jika bukan pendaftaran, cek duplikasi pembayaran berdasarkan fee_type_id dan status lunas
      if (!isPendaftaran) {
        const { data: existingData, error: checkError } = await supabase
          .from('payments')
          .select('*')
          .eq('student_id', financeForm.studentId)
          .eq('fee_type_id', financeForm.feeTypeId)
          .eq('status', 'lunas')

        if (checkError) throw checkError

        if (existingData && existingData.length > 0) {
          setModalConfig({
            isOpen: true,
            title: 'Pembayaran Ditolak',
            message: `Siswa ${selectedStudentObj.nama} sudah melunasi tagihan "${selectedFeeObj.nama_biaya}" ini sebelumnya! Setiap siswa hanya dapat membayar 1 kali per periode/bulan yang sama.`,
            type: 'danger'
          })
          setFinancePaymentModal(false)
          return
        }
      }

      const { error: insertError } = await supabase.from('payments').insert([{
        student_id: financeForm.studentId,
        fee_type_id: financeForm.feeTypeId,
        bulan: selectedFeeObj.nama_biaya,
        jumlah: selectedFeeObj.nominal,
        status: 'lunas'
      }])

      if (insertError) throw insertError

      setFinancePaymentModal(false)
      setFinanceForm({ studentId: '', feeTypeId: '' })
      setModalConfig({
        isOpen: true,
        title: 'Berhasil Dicatat',
        message: `Berhasil mencatat "${selectedFeeObj.nama_biaya}" untuk ${selectedStudentObj.nama}!`,
        type: 'success'
      })
      fetchData()
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'Kesalahan Sistem', message: 'Terjadi kesalahan: ' + error.message, type: 'danger' })
    }
  }

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseForm.keterangan || !expenseForm.jumlah) return

    try {
      const { error } = await supabase.from('expenses').insert([{
        keterangan: expenseForm.keterangan,
        jumlah: Number(expenseForm.jumlah)
      }])

      if (error) throw error

      setExpenseModal(false)
      setExpenseForm({ keterangan: '', jumlah: '' })
      setModalConfig({ isOpen: true, title: 'Berhasil', message: 'Data pengeluaran berhasil dicatat!', type: 'success' })
      fetchData()
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal menyimpan: ' + error.message, type: 'danger' })
    }
  }

  const handleDeleteExpense = (expenseId: string, ket: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Pengeluaran',
      message: `Yakin ingin menghapus catatan pengeluaran "${ket}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
          if (error) throw error
          setExpenses(expenses.filter(e => e.id !== expenseId))
          setModalConfig({ isOpen: true, title: 'Berhasil', message: 'Data pengeluaran dihapus.', type: 'success' })
        } catch (error: any) {
          setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal menghapus: ' + error.message, type: 'danger' })
        }
      }
    })
  }

  const handleAddFeeType = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('fee_types').insert([{ 
        nama_biaya: feeForm.nama_biaya, 
        nominal: Number(feeForm.nominal), 
        kategori: feeForm.kategori 
      }])
      if (error) throw error
      setModalConfig({ isOpen: true, title: 'Berhasil', message: 'Jenis iuran baru berhasil ditambahkan!', type: 'success' })
      setFeeForm({ nama_biaya: '', nominal: '150000', kategori: 'pendaftaran' })
      fetchData()
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal menambah: ' + error.message, type: 'danger' })
    }
  }

  const handleDeleteFeeType = (id: string, nama: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Master Tagihan',
      message: `Hapus master tagihan "${nama}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('fee_types').delete().eq('id', id)
          if (error) throw error
          fetchData()
          setModalConfig({ isOpen: true, title: 'Berhasil', message: 'Master tagihan dihapus.', type: 'success' })
        } catch (error: any) {
          setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal menghapus: ' + error.message, type: 'danger' })
        }
      }
    })
  }

  const handleAddAssessmentType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assessmentForm.nama_aspek) return

    try {
      const { error } = await supabase.from('assessment_types').insert([{
        nama_aspek: assessmentForm.nama_aspek,
        kategori: assessmentForm.kategori
      }])

      if (error) throw error
      setModalConfig({ isOpen: true, title: 'Berhasil', message: 'Aspek asesmen baru berhasil ditambahkan!', type: 'success' })
      setAssessmentForm({ nama_aspek: '', kategori: 'teknik' })
      fetchData()
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal menambah: ' + error.message, type: 'danger' })
    }
  }

  const handleDeleteAssessmentType = (id: string, nama: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Aspek Asesmen',
      message: `Hapus aspek "${nama}" dari master asesmen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('assessment_types').delete().eq('id', id)
          if (error) throw error
          fetchData()
          setModalConfig({ isOpen: true, title: 'Berhasil', message: 'Aspek asesmen dihapus.', type: 'success' })
        } catch (error: any) {
          setModalConfig({ isOpen: true, title: 'Gagal', message: 'Gagal menghapus: ' + error.message, type: 'danger' })
        }
      }
    })
  }

  const handleResetPassword = async (email: string, nama: string) => {
    if (!confirm(`Kirim email tautan reset password ke ${nama} (${email})?`)) return
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login',
      })
      if (error) throw error

      setModalConfig({
        isOpen: true,
        title: 'Berhasil Dikirim',
        message: `Tautan reset kata sandi telah dikirim ke email ${email}.`,
        type: 'success'
      })
    } catch (error: any) {
      setModalConfig({
        isOpen: true,
        title: 'Gagal',
        message: 'Gagal mengirim link reset password: ' + error.message,
        type: 'danger'
      })
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
          <p className="text-gray-500 font-medium text-sm">Memuat panel admin...</p>
        </div>
      </div>
    )
  }

  // --- FILTERED & SORTED STUDENTS (BUKU INDUK) ---
  const filteredStudents = students.filter(s => {
    const matchSearch = s.nama?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.asal_sekolah?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.email?.toLowerCase().includes(studentSearch.toLowerCase())
    const matchStatus = studentStatusFilter === 'all' || s.status?.toLowerCase() === studentStatusFilter.toLowerCase()
    return matchSearch && matchStatus
  }).sort((a, b) => {
    if (studentSortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    if (studentSortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    return a.nama.localeCompare(b.nama)
  })

  const displayedStudents = rowsLimit === -1 ? filteredStudents : filteredStudents.slice(0, rowsLimit)

  // --- LOGIKA FILTER TANGGAL PENDAFTARAN VS PERIODE IURAN (HANYA SISWA AKTIF/PENDING) ---
  const selectedFeeObj = feeTypes.find(f => f.id === selectedFilterFeeId)
  
  const checkStudentObligation = (student: any, fee: any) => {
    const st = student.status?.toLowerCase()
    if (st === 'lulus' || st === 'keluar') return false

    if (!student.created_at || !fee) return true
    const regDate = new Date(student.created_at)
    const regYear = regDate.getFullYear()
    const regMonth = regDate.getMonth() // 0-11

    const nameLower = fee.nama_biaya?.toLowerCase() || ''
    const monthsMap: { [key: string]: number } = {
      'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
      'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    }

    let feeMonth = -1
    let feeYear = -1

    for (const [mName, mIdx] of Object.entries(monthsMap)) {
      if (nameLower.includes(mName)) {
        feeMonth = mIdx
        break
      }
    }

    const yearMatch = nameLower.match(/20\d{2}/)
    if (yearMatch) {
      feeYear = parseInt(yearMatch[0])
    }

    if (feeMonth !== -1 && feeYear !== -1) {
      if (regYear > feeYear || (regYear === feeYear && regMonth > feeMonth)) {
        return false 
      }
    }

    return true
  }

  const eligibleStudentsForFee = students.filter(s => checkStudentObligation(s, selectedFeeObj))

  const studentsWithPaymentStatus = eligibleStudentsForFee.map(student => {
    const hasPaid = payments.some(p => {
      if (p.student_id !== student.id || p.status !== 'lunas') return false

      const matchId = selectedFilterFeeId !== 'all' && p.fee_type_id === selectedFilterFeeId
      const matchName = selectedFeeObj && p.bulan && (
        p.bulan.toLowerCase().includes(selectedFeeObj.nama_biaya.toLowerCase()) ||
        selectedFeeObj.nama_biaya.toLowerCase().includes(p.bulan.toLowerCase())
      )

      return matchId || matchName
    })
    return { ...student, hasPaid }
  })

  const filteredPayments = payments.filter(p => {
    const studentName = p.students?.nama || ''
    const feeName = p.bulan || ''
    const matchSearch = studentName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        feeName.toLowerCase().includes(paymentSearch.toLowerCase())
    const matchStatus = paymentStatusFilter === 'all' || p.status?.toLowerCase() === paymentStatusFilter.toLowerCase()
    return matchSearch && matchStatus
  })

  const displayedPayments = paymentRowsLimit === -1 ? filteredPayments : filteredPayments.slice(0, paymentRowsLimit)
  const displayedExpenses = expenseRowsLimit === -1 ? expenses : expenses.slice(0, expenseRowsLimit)

  const filteredAttendanceStudents = students.filter(s => {
    const matchSearch = s.nama?.toLowerCase().includes(attSearch.toLowerCase()) ||
                        s.asal_sekolah?.toLowerCase().includes(attSearch.toLowerCase())
    const currentStatus = attendanceMap[s.id] || ''
    const matchStatus = attStatusFilter === 'all' || currentStatus === attStatusFilter
    return matchSearch && matchStatus
  })

  const filteredAssessmentStudents = students.filter(s => {
    return s.nama?.toLowerCase().includes(assessSearch.toLowerCase()) ||
           s.asal_sekolah?.toLowerCase().includes(assessSearch.toLowerCase())
  })

  const filteredAttendance = attendanceList.filter(item => {
    return item.tanggal >= reportFilter.startDate && item.tanggal <= reportFilter.endDate
  })

  const attendanceSummaryMap: { [studentId: string]: { hadir: number, izin: number, sakit: number, alpha: number, nama: string, asal_sekolah: string, foto_url: string } } = {}
  
  students.forEach(s => {
    attendanceSummaryMap[s.id] = { hadir: 0, izin: 0, sakit: 0, alpha: 0, nama: s.nama, asal_sekolah: s.asal_sekolah, foto_url: s.foto_url }
  })

  filteredAttendance.forEach(item => {
    if (attendanceSummaryMap[item.student_id]) {
      if (item.status === 'hadir') attendanceSummaryMap[item.student_id].hadir += 1
      if (item.status === 'izin') attendanceSummaryMap[item.student_id].izin += 1
      if (item.status === 'sakit') attendanceSummaryMap[item.student_id].sakit += 1
      if (item.status === 'alpha') attendanceSummaryMap[item.student_id].alpha += 1
    }
  })

  const attendanceSummaryList = Object.values(attendanceSummaryMap).filter(summary => {
    return summary.nama?.toLowerCase().includes(reportSearch.toLowerCase()) ||
           summary.asal_sekolah?.toLowerCase().includes(reportSearch.toLowerCase())
  })

  // Rekap Absen Pelatih & Gaji
  const coachAttendanceSummaryMap: { [coachId: string]: { hadir: number, izin: number, sakit: number, alpha: number, nama: string, no_hp: string, gaji_per_sesi: number } } = {}
  coaches.forEach(c => {
    coachAttendanceSummaryMap[c.id] = { hadir: 0, izin: 0, sakit: 0, alpha: 0, nama: c.nama, no_hp: c.no_hp, gaji_per_sesi: Number(c.gaji_per_sesi) || 0 }
  })

  coachAttendanceList.forEach(item => {
    if (coachAttendanceSummaryMap[item.coach_id]) {
      if (item.status === 'hadir') coachAttendanceSummaryMap[item.coach_id].hadir += 1
      if (item.status === 'izin') coachAttendanceSummaryMap[item.coach_id].izin += 1
      if (item.status === 'sakit') coachAttendanceSummaryMap[item.coach_id].sakit += 1
      if (item.status === 'alpha') coachAttendanceSummaryMap[item.coach_id].alpha += 1
    }
  })

  const coachSummaryList = Object.values(coachAttendanceSummaryMap)

  return (
    <main className="min-h-screen bg-gray-50 py-6 sm:py-10 px-3 sm:px-4 relative">
      <div id="dashboard-content" className="max-w-6xl mx-auto space-y-5">
        
        {/* Header Bar */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-row justify-between items-center gap-3">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-600 rounded-full uppercase tracking-wider">
              Panel Admin
            </span>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mt-1.5 truncate">
              Halo, {adminName}! 👨‍💼
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate sm:whitespace-normal">Kelola pendaftaran, pelatih, keuangan, absen, dan master data</p>
          </div>

          <button
            onClick={handleLogout}
            title="Keluar"
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 text-xs sm:text-sm font-medium rounded-xl transition cursor-pointer shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>

        {/* Tab Navigasi */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-gray-200">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 font-semibold text-xs sm:text-sm rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'students' ? 'bg-[#1E3A8A] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span>👨‍🎓</span> Kelola Siswa ({filteredStudents.length}/{students.length})
          </button>
          <button
            onClick={() => setActiveTab('coaches')}
            className={`px-4 py-2 font-semibold text-xs sm:text-sm rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'coaches' ? 'bg-[#1E3A8A] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span>📋</span> Pelatih & Penggajian ({coaches.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 font-semibold text-xs sm:text-sm rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'attendance' ? 'bg-[#1E3A8A] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span>📋</span> Absensi Siswa
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`px-4 py-2 font-semibold text-xs sm:text-sm rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'assessments' ? 'bg-[#1E3A8A] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span>⚽</span> Asesmen Latihan
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-2 font-semibold text-xs sm:text-sm rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'finance' ? 'bg-[#1E3A8A] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <span>💰</span> Keuangan & Kas
          </button>
        </div>

        {/* TAB 1: KELOLA SISWA */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Buku Induk & Kelola Siswa</h2>
                <p className="text-xs text-gray-500">Kelola status keaktifan siswa (Aktif, Pending, Lulus, Keluar)</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Cari nama/sekolah..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] w-full sm:w-48 bg-white"
                />
                <select
                  value={studentSortBy}
                  onChange={(e) => setStudentSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none bg-white"
                >
                  <option value="oldest">Urut: Paling Lama (Senior)</option>
                  <option value="newest">Urut: Terbaru Masuk</option>
                  <option value="name">Urut: Nama (A-Z)</option>
                </select>
                <select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none bg-white"
                >
                  <option value="all">Semua Status</option>
                  <option value="aktif">Aktif</option>
                  <option value="pending">Pending</option>
                  <option value="lulus">Lulus</option>
                  <option value="keluar">Keluar</option>
                </select>
                <select
                  value={rowsLimit}
                  onChange={(e) => setRowsLimit(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:outline-none"
                >
                  <option value={10}>Tampilkan 10</option>
                  <option value={25}>Tampilkan 25</option>
                  <option value={50}>Tampilkan 50</option>
                  <option value={-1}>Tampilkan Semua</option>
                </select>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="sticky top-0 bg-gray-50 shadow-2xs z-10">
                  <tr className="text-gray-400 text-[11px] sm:text-xs uppercase tracking-wider border-b">
                    <th className="py-3 px-4 sm:px-6">Foto / Nama Siswa</th>
                    <th className="py-3 px-4 sm:px-6">Asal Sekolah</th>
                    <th className="py-3 px-4 sm:px-6">Tgl Masuk</th>
                    <th className="py-3 px-4 sm:px-6">Status Akun</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Aksi / Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs sm:text-sm text-gray-700">
                  {displayedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada data siswa yang cocok dengan pencarian.</td>
                    </tr>
                  ) : (
                    displayedStudents.map((student) => {
                      const st = student.status?.toLowerCase() || 'pending'
                      const regDate = new Date(student.created_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                      
                      let badgeColor = 'bg-yellow-100 text-yellow-700'
                      let dotColor = 'bg-yellow-500'
                      if (st === 'aktif') { badgeColor = 'bg-green-100 text-green-700'; dotColor = 'bg-green-500'; }
                      else if (st === 'lulus') { badgeColor = 'bg-blue-100 text-blue-700'; dotColor = 'bg-blue-500'; }
                      else if (st === 'keluar') { badgeColor = 'bg-red-100 text-red-700'; dotColor = 'bg-red-500'; }

                      return (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3.5 px-4 sm:px-6 flex items-center gap-3">
                            {student.foto_url ? (
                              <img src={student.foto_url} alt={student.nama} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-200 shadow-xs shrink-0" />
                            ) : (
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center border border-gray-200 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold text-gray-900 block truncate">{student.nama}</span>
                              <span className="text-[11px] font-normal text-gray-400 truncate block">{student.email}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6">{student.asal_sekolah || '-'}</td>
                          <td className="py-3.5 px-4 sm:px-6 font-medium text-gray-600">{regDate}</td>
                          <td className="py-3.5 px-4 sm:px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold capitalize ${badgeColor}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              {st}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => {
                                  setSelectedStudent(student)
                                  setEditStudentForm({ ...student })
                                  setIsEditingStudent(false)
                                }}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] font-medium text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
                              >
                                <span>👁️ Detail</span>
                              </button>
                              <a
                                href={`/admin/rapor/${student.id}`}
                                target="_blank"
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
                              >
                                <span>📄 Rapor</span>
                              </a>
                              {st !== 'aktif' ? (
                                <button
                                  onClick={() => handleUpdateStatus(student.id, 'aktif')}
                                  className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white font-medium text-xs rounded-xl transition shadow-sm cursor-pointer"
                                >
                                  <span>✓ Aktifkan</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateStatus(student.id, 'keluar')}
                                  className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-medium text-xs rounded-xl transition cursor-pointer"
                                >
                                  <span>Non-aktifkan</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PELATIH & PENGGAJIAN */}
        {activeTab === 'coaches' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form Tambah Pelatih */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b pb-3">Tambah Pelatih Baru</h2>
                <form onSubmit={handleAddCoach} className="space-y-4 text-sm">
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Nama Pelatih</label>
                    <input
                      type="text"
                      required
                      value={coachForm.nama}
                      onChange={(e) => setCoachForm({ ...coachForm, nama: e.target.value })}
                      placeholder="Contoh: Coach Budi"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">No. HP / WhatsApp</label>
                    <input
                      type="text"
                      value={coachForm.no_hp}
                      onChange={(e) => setCoachForm({ ...coachForm, no_hp: e.target.value })}
                      placeholder="0812..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Honor / Gaji Per Sesi (Rp)</label>
                    <input
                      type="number"
                      required
                      value={coachForm.gaji_per_sesi}
                      onChange={(e) => setCoachForm({ ...coachForm, gaji_per_sesi: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1E3A8A] text-white font-semibold rounded-xl hover:bg-blue-900 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>➕ Simpan Pelatih</span>
                  </button>
                </form>
              </div>

              {/* Daftar Pelatih */}
              <div className="md:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b pb-3">Daftar Pelatih ({coaches.length})</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wider border-b">
                        <th className="py-3 px-4">Nama Pelatih</th>
                        <th className="py-3 px-4">No. HP</th>
                        <th className="py-3 px-4">Gaji / Sesi</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {coaches.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-6 text-gray-400">Belum ada data pelatih.</td></tr>
                      ) : (
                        coaches.map((c) => (
                          <tr key={c.id}>
                            <td className="py-3 px-4 font-semibold text-gray-900">{c.nama}</td>
                            <td className="py-3 px-4">{c.no_hp || '-'}</td>
                            <td className="py-3 px-4 font-semibold text-green-600">Rp {Number(c.gaji_per_sesi).toLocaleString('id-ID')}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleDeleteCoach(c.id, c.nama)}
                                className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold rounded-lg transition cursor-pointer"
                              >
                                🗑️ Hapus
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Input & Rekap Absen Pelatih untuk Gaji */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Absensi & Dasar Penggajian Pelatih</h3>
                  <p className="text-xs text-gray-500">Catat kehadiran pelatih per tanggal latihan untuk akumulasi gaji otomatis</p>
                </div>
                <div>
                  <input
                    type="date"
                    value={coachAttendanceDate}
                    onChange={(e) => setCoachAttendanceDate(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                  />
                </div>
              </div>

              <form onSubmit={handleSaveCoachAttendance} className="space-y-4">
                <div className="max-h-[350px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 uppercase text-[11px] border-b">
                        <th className="py-3 px-4">Nama Pelatih</th>
                        <th className="py-3 px-4">Gaji/Sesi</th>
                        <th className="py-3 px-4 text-center">Status Kehadiran Hari Ini</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {coaches.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-6 text-gray-400">Belum ada data pelatih.</td></tr>
                      ) : (
                        coaches.map((coach) => {
                          const currentStatus = coachAttendanceMap[coach.id] || ''
                          return (
                            <tr key={coach.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4 font-semibold text-gray-900">{coach.nama}</td>
                              <td className="py-3 px-4 text-gray-600">Rp {Number(coach.gaji_per_sesi).toLocaleString('id-ID')}</td>
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex rounded-xl p-1 bg-gray-100 border gap-1">
                                  {[
                                    { key: 'hadir', label: 'Hadir', activeColor: 'bg-green-600 text-white' },
                                    { key: 'izin', label: 'Izin', activeColor: 'bg-blue-600 text-white' },
                                    { key: 'sakit', label: 'Sakit', activeColor: 'bg-yellow-500 text-white' },
                                    { key: 'alpha', label: 'Alpha', activeColor: 'bg-red-600 text-white' }
                                  ].map((item) => (
                                    <button
                                      key={item.key}
                                      type="button"
                                      onClick={() => setCoachAttendanceMap(prev => ({ ...prev, [coach.id]: item.key }))}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${currentStatus === item.key ? item.activeColor : 'text-gray-600 hover:bg-white'}`}
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={savingCoachAtt}
                    className="px-6 py-2.5 bg-[#1E3A8A] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    💾 Simpan Absensi Pelatih
                  </button>
                </div>
              </form>

              {/* Tabel Akumulasi Gaji Pelatih */}
              <div className="pt-6 border-t space-y-3">
                <h4 className="font-bold text-gray-900 text-sm">Akumulasi Honor / Perhitungan Gaji Berdasarkan Kehadiran Hadir</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 uppercase text-[11px] border-b">
                        <th className="py-3 px-4">Nama Pelatih</th>
                        <th className="py-3 px-4 text-center text-green-600 font-bold">Total Hadir</th>
                        <th className="py-3 px-4">Gaji / Sesi</th>
                        <th className="py-3 px-4 font-bold text-[#1E3A8A]">Total Honor Diterima</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {coachSummaryList.map((cs, idx) => {
                        const totalHonor = cs.hadir * cs.gaji_per_sesi
                        return (
                          <tr key={idx}>
                            <td className="py-3 px-4 font-semibold text-gray-900">{cs.nama}</td>
                            <td className="py-3 px-4 text-center font-bold text-green-600 bg-green-50/20">{cs.hadir} sesi</td>
                            <td className="py-3 px-4">Rp {cs.gaji_per_sesi.toLocaleString('id-ID')}</td>
                            <td className="py-3 px-4 font-extrabold text-[#1E3A8A] bg-blue-50/20">Rp {totalHonor.toLocaleString('id-ID')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ABSENSI SISWA */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
              <button
                onClick={() => setAttendanceSubTab('input')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${attendanceSubTab === 'input' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                📋 Input Absen Massal (Per Tanggal)
              </button>
              <button
                onClick={() => setAttendanceSubTab('report')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${attendanceSubTab === 'report' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                📊 Laporan & Rekap Absen
              </button>
            </div>

            {attendanceSubTab === 'input' && (
              <form onSubmit={handleSaveAllAttendance} className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Form Kehadiran Massal Siswa</h3>
                    <p className="text-xs text-gray-500">Pilih tanggal latihan, tentukan status kehadiran tiap siswa</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Cari nama siswa..."
                      value={attSearch}
                      onChange={(e) => setAttSearch(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] w-full sm:w-44 bg-white"
                    />
                    <select
                      value={attStatusFilter}
                      onChange={(e) => setAttStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:outline-none"
                    >
                      <option value="all">Semua Status</option>
                      <option value="hadir">Hadir</option>
                      <option value="izin">Izin</option>
                      <option value="sakit">Sakit</option>
                      <option value="alpha">Alpha</option>
                      <option value="">Belum Absen</option>
                    </select>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    />
                  </div>
                </div>

                <div className="max-h-[450px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[650px] text-xs sm:text-sm">
                    <thead className="sticky top-0 bg-gray-50 shadow-2xs z-10">
                      <tr className="text-gray-400 uppercase tracking-wider border-b text-[11px]">
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">Asal Sekolah</th>
                        <th className="py-3 px-4 text-center">Status Kehadiran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredAttendanceStudents.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-8 text-gray-400">Tidak ada siswa.</td></tr>
                      ) : (
                        filteredAttendanceStudents.map((student) => {
                          const currentStatus = attendanceMap[student.id] || ''
                          return (
                            <tr key={student.id} className="hover:bg-gray-50/50 transition">
                              <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-3">
                                {student.foto_url ? (
                                  <img src={student.foto_url} alt="" className="w-9 h-9 rounded-full object-cover border" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-xs">
                                    {student.nama.charAt(0)}
                                  </div>
                                )}
                                <span>{student.nama}</span>
                              </td>
                              <td className="py-3.5 px-4 text-gray-600">{student.asal_sekolah || '-'}</td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex rounded-xl p-1 bg-gray-100 border border-gray-200 gap-1">
                                  {[
                                    { key: 'hadir', label: 'Hadir', activeColor: 'bg-green-600 text-white shadow-xs' },
                                    { key: 'izin', label: 'Izin', activeColor: 'bg-blue-600 text-white shadow-xs' },
                                    { key: 'sakit', label: 'Sakit', activeColor: 'bg-yellow-500 text-white shadow-xs' },
                                    { key: 'alpha', label: 'Alpha', activeColor: 'bg-red-600 text-white shadow-xs' }
                                  ].map((item) => (
                                    <button
                                      key={item.key}
                                      type="button"
                                      onClick={() => setAttendanceMap(prev => ({ ...prev, [student.id]: item.key }))}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${currentStatus === item.key ? item.activeColor : 'text-gray-600 hover:bg-white'}`}
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={savingAttendance}
                    className="px-6 py-3 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
                  >
                    <span>💾 Simpan Semua Absensi Siswa</span>
                  </button>
                </div>
              </form>
            )}

            {attendanceSubTab === 'report' && (
              <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Rekapitulasi Kehadiran Siswa</h3>
                    <p className="text-xs text-gray-500">Akumulasi jumlah Hadir, Izin, Sakit, dan Alpha</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <input
                      type="text"
                      placeholder="Cari siswa..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] w-full sm:w-44 bg-white"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Dari:</span>
                      <input type="date" value={reportFilter.startDate} onChange={(e) => setReportFilter({ ...reportFilter, startDate: e.target.value })} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Sampai:</span>
                      <input type="date" value={reportFilter.endDate} onChange={(e) => setReportFilter({ ...reportFilter, endDate: e.target.value })} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white" />
                    </div>
                  </div>
                </div>

                <div className="max-h-[450px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[700px]">
                    <thead className="sticky top-0 bg-gray-50 shadow-2xs z-10">
                      <tr className="text-gray-400 text-[11px] uppercase tracking-wider border-b">
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">Asal Sekolah</th>
                        <th className="py-3 px-4 text-center text-green-600 font-bold">Hadir</th>
                        <th className="py-3 px-4 text-center text-blue-600 font-bold">Izin</th>
                        <th className="py-3 px-4 text-center text-yellow-600 font-bold">Sakit</th>
                        <th className="py-3 px-4 text-center text-red-600 font-bold">Alpha</th>
                        <th className="py-3 px-4 text-center font-bold">Total Sesi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {attendanceSummaryList.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-400">Tidak ada rekap absensi.</td></tr>
                      ) : (
                        attendanceSummaryList.map((summary, idx) => {
                          const total = summary.hadir + summary.izin + summary.sakit + summary.alpha
                          return (
                            <tr key={idx} className="hover:bg-gray-50/50 transition">
                              <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-2.5">
                                {summary.foto_url ? (
                                  <img src={summary.foto_url} alt="" className="w-7 h-7 rounded-full object-cover border" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-xs">
                                    {summary.nama.charAt(0)}
                                  </div>
                                )}
                                <span>{summary.nama}</span>
                              </td>
                              <td className="py-3.5 px-4 text-gray-600">{summary.asal_sekolah || '-'}</td>
                              <td className="py-3.5 px-4 text-center font-bold text-green-600 bg-green-50/30">{summary.hadir}</td>
                              <td className="py-3.5 px-4 text-center font-bold text-blue-600 bg-blue-50/30">{summary.izin}</td>
                              <td className="py-3.5 px-4 text-center font-bold text-yellow-600 bg-yellow-50/30">{summary.sakit}</td>
                              <td className="py-3.5 px-4 text-center font-bold text-red-600 bg-red-50/30">{summary.alpha}</td>
                              <td className="py-3.5 px-4 text-center font-bold text-gray-800">{total} sesi</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ASESMEN LATIHAN */}
        {activeTab === 'assessments' && (
          <div className="space-y-6">
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
              <button
                onClick={() => setAssessmentSubTab('input')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${assessmentSubTab === 'input' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                ⚽ Input Nilai Massal (Per Tanggal & Aspek)
              </button>
              <button
                onClick={() => setAssessmentSubTab('master')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${assessmentSubTab === 'master' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                📑 Master Aspek Penilaian
              </button>
            </div>

            {assessmentSubTab === 'input' && (
              <form onSubmit={handleSaveAllAssessments} className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Form Input Nilai & Asesmen Massal</h3>
                    <p className="text-xs text-gray-500">Pilih tanggal dan aspek, ketik nilai angka seluruh siswa</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <input
                      type="text"
                      placeholder="Cari siswa..."
                      value={assessSearch}
                      onChange={(e) => setAssessSearch(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] w-full sm:w-40 bg-white"
                    />
                    <select
                      value={selectedAspek}
                      onChange={(e) => setSelectedAspek(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:outline-none"
                    >
                      {assessmentTypes.length === 0 ? (
                        <option value="">Master asesmen kosong</option>
                      ) : (
                        assessmentTypes.map((t) => (
                          <option key={t.id} value={t.nama_aspek}>{t.nama_aspek} ({t.kategori})</option>
                        ))
                      )}
                    </select>
                    <input
                      type="date"
                      value={assessDate}
                      onChange={(e) => setAssessDate(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                    />
                  </div>
                </div>

                <div className="max-h-[450px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[650px] text-xs sm:text-sm">
                    <thead className="sticky top-0 bg-gray-50 shadow-2xs z-10">
                      <tr className="text-gray-400 uppercase tracking-wider border-b text-[11px]">
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-4">Asal Sekolah</th>
                        <th className="py-3 px-4 text-center">Nilai Angka</th>
                        <th className="py-3 px-4">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredAssessmentStudents.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-8 text-gray-400">Tidak ada siswa.</td></tr>
                      ) : (
                        filteredAssessmentStudents.map((student) => {
                          const record = assessScoresMap[student.id] || { nilai: '', catatan: '' }
                          return (
                            <tr key={student.id} className="hover:bg-gray-50/50 transition">
                              <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-3">
                                {student.foto_url ? (
                                  <img src={student.foto_url} alt="" className="w-9 h-9 rounded-full object-cover border" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-xs">
                                    {student.nama.charAt(0)}
                                  </div>
                                )}
                                <span>{student.nama}</span>
                              </td>
                              <td className="py-3.5 px-4 text-gray-600">{student.asal_sekolah || '-'}</td>
                              <td className="py-3.5 px-4 text-center w-40">
                                <input
                                  type="number"
                                  placeholder="Cth: 25"
                                  value={record.nilai}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setAssessScoresMap(prev => ({ ...prev, [student.id]: { ...record, nilai: val } }))
                                  }}
                                  className="w-24 text-center px-3 py-2 rounded-xl border border-gray-300 font-bold text-sm text-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] bg-white shadow-2xs"
                                />
                              </td>
                              <td className="py-3.5 px-4">
                                <input
                                  type="text"
                                  placeholder="Catatan pelatih..."
                                  value={record.catatan}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setAssessScoresMap(prev => ({ ...prev, [student.id]: { ...record, catatan: val } }))
                                  }}
                                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                                />
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    type="submit"
                    disabled={savingAssess}
                    className="px-6 py-3 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
                  >
                    <span>💾 Simpan Semua Nilai Asesmen</span>
                  </button>
                </div>
              </form>
            )}

            {assessmentSubTab === 'master' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b pb-3">Tambah Aspek Asesmen</h2>
                  <form onSubmit={handleAddAssessmentType} className="space-y-4 text-sm">
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Nama Aspek</label>
                      <input
                        type="text"
                        required
                        value={assessmentForm.nama_aspek}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, nama_aspek: e.target.value })}
                        placeholder="Contoh: Juggling (Repetisi)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Kategori</label>
                      <select
                        value={assessmentForm.kategori}
                        onChange={(e) => setAssessmentForm({ ...assessmentForm, kategori: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] bg-white capitalize"
                      >
                        <option value="teknik">Teknik Dasar</option>
                        <option value="fisik">Fisik & Stamina</option>
                        <option value="taktik">Taktik & Posisi</option>
                        <option value="mental">Mental & Kedisiplinan</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-[#1E3A8A] text-white font-semibold rounded-xl hover:bg-blue-900 transition cursor-pointer">
                      <span>➕ Simpan Aspek</span>
                    </button>
                  </form>
                </div>

                <div className="md:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b pb-3">Daftar Aspek Penilaian Rapor ({assessmentTypes.length})</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[450px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 text-[11px] sm:text-xs uppercase tracking-wider border-b">
                          <th className="py-3 px-4">Nama Aspek</th>
                          <th className="py-3 px-4">Kategori</th>
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {assessmentTypes.length === 0 ? (
                          <tr><td colSpan={3} className="text-center py-6 text-gray-400">Belum ada aspek.</td></tr>
                        ) : (
                          assessmentTypes.map((item) => (
                            <tr key={item.id}>
                              <td className="py-3 px-4 font-semibold text-gray-900">{item.nama_aspek}</td>
                              <td className="py-3 px-4 capitalize"><span className="px-2.5 py-1 bg-blue-50 text-[#1E3A8A] rounded-full text-[11px] font-semibold">{item.kategori}</span></td>
                              <td className="py-3 px-4 text-center">
                                <button onClick={() => handleDeleteAssessmentType(item.id, item.nama_aspek)} className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-lg cursor-pointer">🗑️ Hapus</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: KEUANGAN & KAS */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
              <button
                onClick={() => setFinanceSubTab('report')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${financeSubTab === 'report' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                📊 Laporan & Transaksi Kas
              </button>
              <button
                onClick={() => setFinanceSubTab('master_fees')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer ${financeSubTab === 'master_fees' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                📑 Master Jenis Iuran ({feeTypes.length})
              </button>
            </div>

            {financeSubTab === 'report' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-1">
                    <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Pemasukan (Lunas)</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">Rp {totalPemasukan.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-1">
                    <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Pengeluaran</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">Rp {totalPengeluaran.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#1E3A8A] to-blue-900 p-5 sm:p-6 rounded-2xl shadow-md text-white space-y-1">
                    <p className="text-[11px] sm:text-xs font-semibold text-blue-200 uppercase tracking-wider">Saldo Kas Real-Time</p>
                    <p className="text-xl sm:text-2xl font-bold">Rp {saldoBersih.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                {/* PEMANTAUAN TAGIHAN (Hanya Siswa Aktif) */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900">Pemantauan Status Tagihan Siswa (Aktif)</h2>
                      <p className="text-xs text-gray-500">Siswa berstatus Lulus atau Keluar otomatis dikecualikan dari tagihan wajib</p>
                    </div>
                    <div className="w-full sm:w-auto">
                      <select
                        value={selectedFilterFeeId}
                        onChange={(e) => setSelectedFilterFeeId(e.target.value)}
                        className="w-full sm:w-72 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-xs font-semibold bg-white"
                      >
                        {feeTypes.map((fee) => (
                          <option key={fee.id} value={fee.id}>{fee.nama_biaya} (Rp {Number(fee.nominal).toLocaleString('id-ID')})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-green-800 uppercase tracking-wide">Sudah Lunas ({studentsWithPaymentStatus.filter(s => s.hasPaid).length})</span>
                        <span className="text-xs bg-green-200 text-green-800 font-bold px-2 py-0.5 rounded-full">✓</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {studentsWithPaymentStatus.filter(s => s.hasPaid).length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Belum ada.</p>
                        ) : (
                          studentsWithPaymentStatus.filter(s => s.hasPaid).map(s => (
                            <span key={s.id} className="text-xs px-2.5 py-1 bg-white border border-green-200 text-green-700 font-semibold rounded-lg">{s.nama}</span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-red-800 uppercase tracking-wide">Belum Lunas ({studentsWithPaymentStatus.filter(s => !s.hasPaid).length})</span>
                        <span className="text-xs bg-red-200 text-red-800 font-bold px-2 py-0.5 rounded-full">!</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {studentsWithPaymentStatus.filter(s => !s.hasPaid).length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Semua lunas!</p>
                        ) : (
                          studentsWithPaymentStatus.filter(s => !s.hasPaid).map(s => (
                            <span key={s.id} className="text-xs px-2.5 py-1 bg-white border border-red-200 text-red-700 font-semibold rounded-lg">{s.nama}</span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TABEL PEMASUKAN */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4">
                  <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900">Riwayat Pemasukan (Siswa)</h2>
                      <p className="text-xs text-gray-500">Semua transaksi pembayaran masuk</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Cari siswa..."
                        value={paymentSearch}
                        onChange={(e) => setPaymentSearch(e.target.value)}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] w-full sm:w-44 bg-white"
                      />
                      <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white">
                        <option value="all">Semua Status</option>
                        <option value="lunas">Lunas</option>
                        <option value="belum lunas">Belum Lunas</option>
                      </select>
                      <button
                        onClick={() => {
                          if (feeTypes.length === 0) {
                            setModalConfig({ isOpen: true, title: 'Perhatian', message: 'Master iuran kosong!', type: 'info' })
                            return
                          }
                          setFinanceForm({ studentId: students[0]?.id || '', feeTypeId: feeTypes[0]?.id || '' })
                          setFinancePaymentModal(true)
                        }}
                        className="px-4 py-2 bg-[#1E3A8A] text-white font-semibold text-xs rounded-xl shadow-sm cursor-pointer"
                      >
                        <span>➕ Catat Pembayaran</span>
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[450px] overflow-y-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[650px]">
                      <thead className="sticky top-0 bg-gray-50 shadow-2xs z-10">
                        <tr className="text-gray-400 text-[11px] sm:text-xs uppercase tracking-wider border-b">
                          <th className="py-3 px-4 sm:px-6">Nama Siswa</th>
                          <th className="py-3 px-4 sm:px-6">Jenis Tagihan</th>
                          <th className="py-3 px-4 sm:px-6">Nominal</th>
                          <th className="py-3 px-4 sm:px-6">Status</th>
                          <th className="py-3 px-4 sm:px-6 text-center">Aksi / Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {displayedPayments.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada transaksi.</td></tr>
                        ) : (
                          displayedPayments.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50/50 transition">
                              <td className="py-3 px-4 sm:px-6 font-semibold text-gray-900">{p.students?.nama || 'Siswa'}</td>
                              <td className="py-3 px-4 sm:px-6 text-gray-600">{p.bulan}</td>
                              <td className="py-3 px-4 sm:px-6 font-semibold text-gray-800">Rp {Number(p.jumlah).toLocaleString('id-ID')}</td>
                              <td className="py-3 px-4 sm:px-6">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold capitalize ${p.status === 'lunas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 sm:px-6 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {p.status === 'lunas' && (
                                    <button onClick={() => setSelectedInvoice(p)} className="px-2.5 py-1 bg-blue-50 text-[#1E3A8A] text-xs font-semibold rounded-lg cursor-pointer">
                                      📄 Invoice
                                    </button>
                                  )}
                                  <button onClick={() => handleDeletePayment(p.id, p.bulan)} className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-lg cursor-pointer">
                                    🗑️ Hapus
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABEL PENGELUARAN */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4">
                  <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900">Riwayat Pengeluaran Kas</h2>
                      <p className="text-xs text-gray-500">Catat seluruh biaya operasional</p>
                    </div>
                    <button onClick={() => setExpenseModal(true)} className="px-4 py-2 bg-red-600 text-white font-semibold text-xs rounded-xl cursor-pointer">
                      <span>➕ Catat Pengeluaran</span>
                    </button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[550px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wider border-b">
                          <th className="py-3 px-4">Keterangan</th>
                          <th className="py-3 px-4">Nominal</th>
                          <th className="py-3 px-4">Tanggal</th>
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {displayedExpenses.length === 0 ? (
                          <tr><td colSpan={4} className="text-center py-6 text-gray-400">Belum ada pengeluaran.</td></tr>
                        ) : (
                          displayedExpenses.map((e) => (
                            <tr key={e.id} className="hover:bg-gray-50">
                              <td className="py-3 px-4 font-semibold text-gray-900">{e.keterangan}</td>
                              <td className="py-3 px-4 font-semibold text-red-600">Rp {Number(e.jumlah).toLocaleString('id-ID')}</td>
                              <td className="py-3 px-4 text-gray-500 text-xs">{new Date(e.created_at).toLocaleDateString('id-ID')}</td>
                              <td className="py-3 px-4 text-center">
                                <button onClick={() => handleDeleteExpense(e.id, e.keterangan)} className="px-2.5 py-1 bg-red-50 text-red-600 text-xs rounded-lg">🗑️ Hapus</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {financeSubTab === 'master_fees' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b pb-3">Tambah Master Tagihan</h2>
                  <form onSubmit={handleAddFeeType} className="space-y-4 text-sm">
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Nama Tagihan</label>
                      <input type="text" required value={feeForm.nama_biaya} onChange={(e) => setFeeForm({ ...feeForm, nama_biaya: e.target.value })} placeholder="Contoh: SPP Juli 2026" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200" />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Nominal Baku (Rp)</label>
                      <input type="number" required value={feeForm.nominal} onChange={(e) => setFeeForm({ ...feeForm, nominal: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200" />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Kategori</label>
                      <select value={feeForm.kategori} onChange={(e) => setFeeForm({ ...feeForm, kategori: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white">
                        <option value="pendaftaran">Pendaftaran</option>
                        <option value="spp">SPP Bulanan</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-[#1E3A8A] text-white font-semibold rounded-xl">Simpan Tagihan</button>
                  </form>
                </div>

                <div className="md:col-span-2 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 border-b pb-3">Daftar Jenis Iuran ({feeTypes.length})</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-400 uppercase text-[11px] border-b">
                          <th className="py-3 px-4">Nama Tagihan</th>
                          <th className="py-3 px-4">Kategori</th>
                          <th className="py-3 px-4">Nominal</th>
                          <th className="py-3 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {feeTypes.map((fee) => (
                          <tr key={fee.id}>
                            <td className="py-3 px-4 font-semibold text-gray-900">{fee.nama_biaya}</td>
                            <td className="py-3 px-4 capitalize"><span className="px-2.5 py-1 bg-gray-100 rounded-full text-[11px]">{fee.kategori}</span></td>
                            <td className="py-3 px-4 font-medium text-gray-800">Rp {Number(fee.nominal).toLocaleString('id-ID')}</td>
                            <td className="py-3 px-4 text-center"><button onClick={() => handleDeleteFeeType(fee.id, fee.nama_biaya)} className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-lg">Hapus</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* --- MODAL DETAIL & EDIT SISWA --- */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-3">
                {selectedStudent.foto_url ? (
                  <img src={selectedStudent.foto_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-[#1E3A8A]" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold">?</div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{isEditingStudent ? 'Edit Data Siswa' : selectedStudent.nama}</h3>
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-blue-100 text-blue-700 mt-1">
                    Status: {selectedStudent.status || 'pending'}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            {!isEditingStudent ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm bg-gray-50 p-4 rounded-2xl">
                  <div><p className="text-gray-400 text-[11px]">Nama</p><p className="font-semibold">{selectedStudent.nama}</p></div>
                  <div><p className="text-gray-400 text-[11px]">Email</p><p className="font-semibold">{selectedStudent.email}</p></div>
                  <div><p className="text-gray-400 text-[11px]">No HP</p><p className="font-semibold">{selectedStudent.no_hp || '-'}</p></div>
                  <div><p className="text-gray-400 text-[11px]">Sekolah</p><p className="font-semibold">{selectedStudent.asal_sekolah || '-'}</p></div>
                  <div><p className="text-gray-400 text-[11px]">Status Akademik</p><p className="font-semibold uppercase text-blue-600">{selectedStudent.status || 'pending'}</p></div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveStudentEdit} className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl">
                  <div>
                    <label className="block text-gray-500 text-[11px] mb-1">Nama Lengkap</label>
                    <input type="text" value={editStudentForm.nama || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, nama: e.target.value })} className="w-full px-3 py-2 bg-white rounded-xl border" required />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-[11px] mb-1">Status Keaktifan Siswa</label>
                    <select
                      value={editStudentForm.status || 'pending'}
                      onChange={(e) => setEditStudentForm({ ...editStudentForm, status: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl border font-semibold capitalize"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="pending">Pending</option>
                      <option value="lulus">Lulus</option>
                      <option value="keluar">Keluar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-500 text-[11px] mb-1">No HP</label>
                    <input type="text" value={editStudentForm.no_hp || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, no_hp: e.target.value })} className="w-full px-3 py-2 bg-white rounded-xl border" />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-[11px] mb-1">Asal Sekolah</label>
                    <input type="text" value={editStudentForm.asal_sekolah || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, asal_sekolah: e.target.value })} className="w-full px-3 py-2 bg-white rounded-xl border" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsEditingStudent(false)} className="px-4 py-2 bg-gray-200 text-xs font-semibold rounded-xl">Batal</button>
                  <button type="submit" className="px-5 py-2 bg-green-600 text-white text-xs font-semibold rounded-xl">💾 Simpan Perubahan</button>
                </div>
              </form>
            )}

            {!isEditingStudent && (
              <div className="pt-2 border-t flex justify-between items-center">
                <div className="flex gap-2">
                  <button onClick={() => handleResetPassword(selectedStudent.email, selectedStudent.nama)} className="px-3.5 py-2 bg-yellow-500 text-white text-xs font-bold rounded-xl">🔑 Reset Password</button>
                  <button onClick={() => setIsEditingStudent(true)} className="px-3.5 py-2 bg-[#1E3A8A] text-white text-xs font-bold rounded-xl">✏️ Edit Data / Status</button>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="px-5 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl">Tutup</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL INVOICE PEMBAYARAN DIGITAL (STRUK RAPI & SIAP CETAK) --- */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <style jsx global>{`
            @media print {
              body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              #dashboard-content, header, nav, .no-print {
                display: none !important;
              }
              #printable-receipt {
                position: fixed !important;
                top: 0 !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                width: 80mm !important;
                max-width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                padding: 5px !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl space-y-4">
            <div id="printable-receipt" className="space-y-4 bg-white">
              <div className="text-center border-b pb-3 space-y-0.5">
                <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full uppercase">LUNAS</span>
                <h3 className="text-sm font-bold text-gray-900 mt-1">Academy Soccer Junior</h3>
                <p className="text-[10px] text-gray-500">Struk Pembayaran Resmi</p>
              </div>

              <div className="space-y-1.5 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex justify-between"><span className="text-gray-500">Siswa:</span><span className="font-bold text-gray-900">{selectedInvoice.students?.nama || 'Siswa'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tagihan:</span><span className="font-semibold text-gray-900">{selectedInvoice.bulan}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Nominal:</span><span className="font-bold text-green-600">Rp {Number(selectedInvoice.jumlah).toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tanggal:</span><span className="font-semibold text-gray-900">{new Date(selectedInvoice.created_at).toLocaleDateString('id-ID')}</span></div>
              </div>
            </div>

            <div className="flex gap-2 pt-1 no-print">
              <button onClick={() => window.print()} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer">🖨️ Cetak</button>
              <button onClick={() => setSelectedInvoice(null)} className="flex-1 py-2 bg-[#1E3A8A] text-white text-xs font-bold rounded-xl cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Catat Pembayaran & Pengeluaran lainnya */}
      {financePaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Catat Pembayaran Masuk</h3>
              <button onClick={() => setFinancePaymentModal(false)} className="text-gray-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveFinancePayment} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Pilih Siswa (Aktif)</label>
                <select value={financeForm.studentId} onChange={(e) => setFinanceForm({ ...financeForm, studentId: e.target.value })} className="w-full px-3.5 py-2.5 border rounded-xl bg-white text-xs">
                  {students.filter(s => s.status?.toLowerCase() === 'aktif').map((s) => (
                    <option key={s.id} value={s.id}>{s.nama} ({s.asal_sekolah || '-'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Pilih Jenis Tagihan</label>
                <select value={financeForm.feeTypeId} onChange={(e) => setFinanceForm({ ...financeForm, feeTypeId: e.target.value })} className="w-full px-3.5 py-2.5 border rounded-xl bg-white text-xs">
                  {feeTypes.map((f) => (
                    <option key={f.id} value={f.id}>{f.nama_biaya} — Rp {Number(f.nominal).toLocaleString('id-ID')}</option>
                  ))}
                </select>
              </div>
              <div className="pt-3 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setFinancePaymentModal(false)} className="px-4 py-2 bg-gray-100 text-xs rounded-xl font-semibold">Batal</button>
                <button type="submit" className="px-5 py-2 bg-[#1E3A8A] text-white text-xs rounded-xl font-semibold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {expenseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Catat Pengeluaran</h3>
              <button onClick={() => setExpenseModal(false)} className="text-gray-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveExpense} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-600 font-medium mb-1">Keterangan</label>
                <input type="text" required value={expenseForm.keterangan} onChange={(e) => setExpenseForm({ ...expenseForm, keterangan: e.target.value })} placeholder="Cth: Beli Bola" className="w-full px-3.5 py-2.5 border rounded-xl" />
              </div>
              <div>
                <label className="block text-gray-600 font-medium mb-1">Nominal (Rp)</label>
                <input type="number" required value={expenseForm.jumlah} onChange={(e) => setExpenseForm({ ...expenseForm, jumlah: e.target.value })} className="w-full px-3.5 py-2.5 border rounded-xl" />
              </div>
              <div className="pt-3 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setExpenseModal(false)} className="px-4 py-2 bg-gray-100 text-xs rounded-xl font-semibold">Batal</button>
                <button type="submit" className="px-5 py-2 bg-red-600 text-white text-xs rounded-xl font-semibold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{modalConfig.title}</h3>
            <p className="text-sm text-gray-600">{modalConfig.message}</p>
            <button onClick={() => {
              const act = modalConfig.onConfirm
              setModalConfig({ isOpen: false, title: '', message: '', type: 'info' })
              if (act) act()
            }} className="w-full py-2.5 bg-[#1E3A8A] text-white text-sm font-semibold rounded-xl">OK</button>
          </div>
        </div>
      )}
    </main>
  )
}