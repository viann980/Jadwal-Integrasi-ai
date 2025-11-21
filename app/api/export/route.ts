import { NextResponse } from "next/server"

type Student = { id: string; name: string; major: string; semester: number }
type Class = { code: string; name: string; major: string; lecturer: string }
type Schedule = {
  code: string
  day: string
  start: string
  end: string
  room: string
  capacity: number
  semester: number
}

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

function toCSV(rows: string[][]) {
  return rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n")
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId") || "S001"
  const student = students.find((s) => s.id === studentId) ?? students[0]

  const filtered = schedules
    .filter((s) => s.semester === student.semester)
    .filter((s) => classes.find((c) => c.code === s.code)?.major === student.major)

  const header = [
    [
      "ID_Mahasiswa",
      "Nama_Mahasiswa",
      "Jurusan",
      "Semester",
      "Kode_MK",
      "Nama_MK",
      "Dosen",
      "Hari",
      "Waktu_Mulai",
      "Waktu_Selesai",
      "Lokasi_Ruangan",
      "Kapasitas",
    ],
  ]
  const body = filtered.map((s) => {
    const c = classes.find((x) => x.code === s.code)!
    return [
      student.id,
      student.name,
      student.major,
      String(student.semester),
      s.code,
      c.name,
      c.lecturer,
      s.day,
      s.start,
      s.end,
      s.room,
      String(s.capacity),
    ]
  })

  const csv = toCSV([...header, ...body])
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jadwal_${student.id}.csv"`,
    },
  })
}
