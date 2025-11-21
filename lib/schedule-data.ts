export type Course = {
  code: string
  name: string
  credits: number
}

export type ClassSection = {
  id: string
  courseCode: string
  lecturer: string
  room: string
  program: string // e.g., "Informatika"
  group: string // e.g., "A", "B"
}

export type TimeSlot = {
  classId: string
  day: number // 0-6, Sun-Sat
  start: string // "HH:mm"
  end: string // "HH:mm"
}

export type Student = {
  id: string
  name: string
  program: string
  group: string
}

export type ScheduleEntry = {
  section: ClassSection
  course: Course
  slot: TimeSlot
}

const courses: Course[] = [
  { code: "IF101", name: "Algoritma dan Pemrograman", credits: 3 },
  { code: "IF102", name: "Struktur Data", credits: 3 },
  { code: "IF201", name: "Basis Data", credits: 3 },
  { code: "IF202", name: "Jaringan Komputer", credits: 3 },
]

const sections: ClassSection[] = [
  { id: "S1", courseCode: "IF101", lecturer: "Dr. Sinta", room: "R101", program: "Informatika", group: "A" },
  { id: "S2", courseCode: "IF101", lecturer: "Dr. Sinta", room: "R102", program: "Informatika", group: "B" },
  { id: "S3", courseCode: "IF102", lecturer: "Pak Bima", room: "R201", program: "Informatika", group: "A" },
  { id: "S4", courseCode: "IF201", lecturer: "Bu Rani", room: "R202", program: "Informatika", group: "A" },
  { id: "S5", courseCode: "IF202", lecturer: "Pak Dedi", room: "R203", program: "Informatika", group: "B" },
]

const timeSlots: TimeSlot[] = [
  // Senin
  { classId: "S1", day: 1, start: "08:00", end: "09:40" },
  { classId: "S3", day: 1, start: "10:00", end: "11:40" },
  // Selasa
  { classId: "S2", day: 2, start: "09:00", end: "10:40" },
  { classId: "S4", day: 2, start: "11:00", end: "12:40" },
  // Rabu
  { classId: "S5", day: 3, start: "13:00", end: "14:40" },
]

const students: Student[] = [
  { id: "NIM001", name: "Adi Nugraha", program: "Informatika", group: "A" },
  { id: "NIM002", name: "Bela Santosa", program: "Informatika", group: "B" },
]

// Helpers
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function nowToContext(dt: Date) {
  const day = dt.getDay() // 0-6
  const hh = dt.getHours().toString().padStart(2, "0")
  const mm = dt.getMinutes().toString().padStart(2, "0")
  return { day, minutes: toMinutes(`${hh}:${mm}`), hhmm: `${hh}:${mm}` }
}

export function buildScheduleEntries(): ScheduleEntry[] {
  return timeSlots.map((slot) => {
    const section = sections.find((s) => s.id === slot.classId)!
    const course = courses.find((c) => c.code === section.courseCode)!
    return { section, course, slot }
  })
}

export function getCurrentClass(opts?: { datetime?: string; program?: string; group?: string }) {
  const date = opts?.datetime ? new Date(opts.datetime) : new Date()
  const { day, minutes } = nowToContext(date)
  const entries = buildScheduleEntries().filter((e) => e.slot.day === day)

  const filtered = entries.filter((e) => {
    const start = toMinutes(e.slot.start)
    const end = toMinutes(e.slot.end)
    const within = minutes >= start && minutes <= end
    const programOk = opts?.program ? e.section.program.toLowerCase() === opts.program.toLowerCase() : true
    const groupOk = opts?.group ? e.section.group.toLowerCase() === opts.group.toLowerCase() : true
    return within && programOk && groupOk
  })

  return filtered[0] || null
}

export function getNextClass(opts?: { datetime?: string; program?: string; group?: string }) {
  const date = opts?.datetime ? new Date(opts.datetime) : new Date()
  const { day, minutes } = nowToContext(date)
  const entries = buildScheduleEntries()
    .filter((e) => e.slot.day === day)
    .filter((e) => {
      const programOk = opts?.program ? e.section.program.toLowerCase() === opts.program.toLowerCase() : true
      const groupOk = opts?.group ? e.section.group.toLowerCase() === opts.group.toLowerCase() : true
      return programOk && groupOk
    })
    .sort((a, b) => toMinutes(a.slot.start) - toMinutes(b.slot.start))

  for (const e of entries) {
    if (toMinutes(e.slot.start) > minutes) return e
  }
  return null
}

export function getScheduleByCourse(input: { code?: string; name?: string }) {
  const code = input.code?.toLowerCase()
  const name = input.name?.toLowerCase()
  const matchedCourses = courses.filter(
    (c) => (code && c.code.toLowerCase() === code) || (name && c.name.toLowerCase().includes(name!)),
  )
  const set = new Set(matchedCourses.map((c) => c.code))
  return buildScheduleEntries().filter((e) => set.has(e.course.code))
}

export function getScheduleForLecturer(lecturer: string) {
  return buildScheduleEntries().filter((e) => e.section.lecturer.toLowerCase().includes(lecturer.toLowerCase()))
}

export function getScheduleForStudent(input: { id?: string; name?: string }) {
  let student: Student | undefined
  if (input.id) student = students.find((s) => s.id.toLowerCase() === input.id!.toLowerCase())
  if (!student && input.name) {
    const n = input.name.toLowerCase()
    student = students.find((s) => s.name.toLowerCase().includes(n))
  }
  if (!student) return { student: null, schedule: [] as ScheduleEntry[] }

  const schedule = buildScheduleEntries().filter(
    (e) => e.section.program === student!.program && e.section.group === student!.group,
  )
  return { student, schedule }
}

export function toHuman(e: ScheduleEntry) {
  return (
    `${e.course.code} ${e.course.name} — ${e.section.program}-${e.section.group}, ` +
    `${e.section.lecturer}, ${e.section.room}, ${weekday(e.slot.day)} ${e.slot.start}-${e.slot.end}`
  )
}

export function weekday(d: number) {
  return ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][d] || ""
}
