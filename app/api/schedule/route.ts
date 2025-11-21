import { NextResponse } from "next/server"

type Student = { id: string; name: string; major: string; semester: number }
type Class = { code: string; name: string; major: string; lecturer: string }
type Schedule = {
  code: string
  day: string // "Senin", "Selasa", ...
  start: string // "09:00"
  end: string // "10:30"
  room: string
  capacity: number
  semester: number
}
type RealTime = { code: string; status: string; lecturerPresent: boolean }
type History = { lecturer: string; day: string; lateMinutes: number }

const students: Student[] = [
  { id: "S001", name: "Andi", major: "Informatika", semester: 3 },
  { id: "S002", name: "Budi", major: "Sistem Informasi", semester: 3 },
]

const classes: Class[] = [
  { code: "IF101", name: "Algoritma dan Struktur Data", major: "Informatika", lecturer: "Dosen X" },
  { code: "IF201", name: "Basis Data", major: "Informatika", lecturer: "Dosen Y" },
  { code: "SI101", name: "Pengantar Sistem Informasi", major: "Sistem Informasi", lecturer: "Dosen Z" },
]

const schedules: Schedule[] = [
  { code: "IF101", day: "Senin", start: "09:00", end: "10:30", room: "Lab B.201", capacity: 30, semester: 3 },
  { code: "IF201", day: "Senin", start: "13:00", end: "14:30", room: "Ruang C.101", capacity: 40, semester: 3 },
  { code: "SI101", day: "Selasa", start: "08:00", end: "09:30", room: "Ruang A.102", capacity: 35, semester: 3 },
]

const realtime: RealTime[] = [
  { code: "IF101", status: "Berlangsung", lecturerPresent: true },
  { code: "IF201", status: "Tunda 15 Menit", lecturerPresent: false },
  { code: "SI101", status: "Berlangsung", lecturerPresent: true },
]

// data historis untuk prediksi sederhana
const historical: History[] = [
  // Dosen X cenderung tepat waktu
  { lecturer: "Dosen X", day: "Senin", lateMinutes: 0 },
  { lecturer: "Dosen X", day: "Senin", lateMinutes: 0 },
  { lecturer: "Dosen X", day: "Rabu", lateMinutes: 0 },
  // Dosen Y sering terlambat di Senin siang
  { lecturer: "Dosen Y", day: "Senin", lateMinutes: 10 },
  { lecturer: "Dosen Y", day: "Senin", lateMinutes: 15 },
  { lecturer: "Dosen Y", day: "Senin", lateMinutes: 5 },
  { lecturer: "Dosen Y", day: "Kamis", lateMinutes: 0 },
  // Dosen Z acak
  { lecturer: "Dosen Z", day: "Selasa", lateMinutes: 5 },
  { lecturer: "Dosen Z", day: "Selasa", lateMinutes: 0 },
]

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map((v) => Number.parseInt(v, 10))
  return h * 60 + m
}

function formatTime(date = new Date()) {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function nextDayIndex(idx: number) {
  return (idx + 1) % 7
}

function enrich(classCode: string) {
  const c = classes.find((x) => x.code === classCode)
  return c
}

function attachRealTime(info: { code: string }) {
  const rt = realtime.find((r) => r.code === info.code)
  return {
    status: rt?.status ?? "Tidak ada data",
    lecturerPresent: rt?.lecturerPresent ?? false,
  }
}

function predictWarning(lecturer: string, day: string) {
  const records = historical.filter((h) => h.lecturer === lecturer && h.day === day)
  if (records.length === 0) return { probability: 0, text: null as string | null }
  const lateCount = records.filter((r) => r.lateMinutes > 0).length
  const probability = lateCount / records.length
  if (probability > 0.7) {
    return {
      probability,
      text: `Prediksi AI: Kelas ini memiliki potensi terlambat 10-15 menit berdasarkan pola ${lecturer}.`,
    }
  }
  return { probability, text: null as string | null }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId") || "S001"
  const nowParam = searchParams.get("now") // opsional: "HH:MM"
  const nowDate = new Date()
  const todayName = dayNames[nowDate.getDay()]
  const nowMinutes = toMinutes(nowParam ?? `${nowDate.getHours()}:${nowDate.getMinutes()}`)

  const student = students.find((s) => s.id === studentId) ?? students[0]

  // filter jadwal berdasarkan jurusan & semester
  const filtered = schedules.filter(
    (s) => s.semester === student.semester && classes.find((c) => c.code === s.code)?.major === student.major,
  )

  // cari kuliah saat ini
  const todays = filtered.filter((s) => s.day === todayName)
  const current = todays.find((s) => toMinutes(s.start) <= nowMinutes && nowMinutes <= toMinutes(s.end)) || null

  // cari kuliah berikutnya (hari ini), jika tidak ada, cari hari selanjutnya
  let next: Schedule | null =
    todays.filter((s) => toMinutes(s.start) > nowMinutes).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))[0] ??
    null

  if (!next) {
    // ambil jadwal pada hari terdekat berikutnya
    let idx = dayNames.indexOf(todayName)
    for (let i = 0; i < 6 && !next; i++) {
      idx = nextDayIndex(idx)
      const dn = dayNames[idx]
      const list = filtered.filter((s) => s.day === dn).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
      if (list.length > 0) next = list[0]
    }
  }

  // susun response terstruktur
  let currentClass = null as any
  if (current) {
    const c = enrich(current.code)
    if (c) {
      const rt = attachRealTime(current)
      const pred = predictWarning(c.lecturer, current.day)
      currentClass = {
        code: current.code,
        name: c.name,
        lecturer: c.lecturer,
        room: current.room,
        start: current.start,
        end: current.end,
        status: rt.status,
        lecturerPresent: rt.lecturerPresent,
        day: current.day,
        predictionWarning: pred.text,
        predictionProbability: pred.probability,
      }
    }
  }

  let nextClass = null as any
  if (next) {
    const c = enrich(next.code)
    if (c) {
      const rt = attachRealTime(next)
      const pred = predictWarning(c.lecturer, next.day)
      nextClass = {
        code: next.code,
        name: c.name,
        lecturer: c.lecturer,
        room: next.room,
        start: next.start,
        end: next.end,
        status: rt.status,
        lecturerPresent: rt.lecturerPresent,
        day: next.day,
        predictionWarning: pred.text,
        predictionProbability: pred.probability,
      }
    }
  }

  return NextResponse.json({
    now: `${todayName} ${formatTime(nowDate)}`,
    student: { id: student.id, name: student.name, major: student.major, semester: student.semester },
    currentClass,
    nextClass,
  })
}
