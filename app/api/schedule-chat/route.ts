import {
  getCurrentClass,
  getNextClass,
  getScheduleByCourse,
  getScheduleForLecturer,
  getScheduleForStudent,
  toHuman,
  buildScheduleEntries,
} from "@/lib/schedule-data"
import { generateText } from "ai"

export const maxDuration = 30

function parseProgramGroup(q: string) {
  const program = /informatika/i.test(q) ? "Informatika" : undefined
  // simple group detection: "kelas a" or "kelompok a" or standalone "A"/"B" after "kelas"
  const groupMatch = /kelas\s+([a-z])/i.exec(q) || /kelompok\s+([a-z])/i.exec(q) || /\bgrup\s+([a-z])\b/i.exec(q)
  const group = groupMatch ? groupMatch[1].toUpperCase() : undefined
  return { program, group }
}

function parseCourseCodeOrName(q: string) {
  const codeMatch = /\b[A-Z]{2,}\d{3,}\b/.exec(q)
  const code = codeMatch ? codeMatch[0] : undefined
  // crude name attempt (after 'mata kuliah' or 'mk')
  const nameMatch = /mata kuliah\s+([a-z0-9 .-]+)/i.exec(q) || /\bmk\s+([a-z0-9 .-]+)/i.exec(q)
  const name = nameMatch ? nameMatch[1].trim() : undefined
  return { code, name }
}

function parseLecturer(q: string) {
  // detect "dosen <name>" or honorifics "bu <name>" / "pak <name>"
  const m = /dosen\s+([a-z .-]+)/i.exec(q) || /\bbu\s+([a-z .-]+)/i.exec(q) || /\bpak\s+([a-z .-]+)/i.exec(q)
  return m ? m[1].trim() : undefined
}

function parseStudent(q: string) {
  const nimMatch = /\bnim\s*([a-z0-9]+)/i.exec(q)
  const id = nimMatch ? nimMatch[1] : undefined
  // "mahasiswa <name>"
  const nameMatch = /mahasiswa\s+([a-z .-]+)/i.exec(q)
  const name = nameMatch ? nameMatch[1].trim() : undefined
  return { id, name }
}

function todayItems(input: { program?: string; group?: string; datetime?: string }) {
  const date = input?.datetime ? new Date(input.datetime) : new Date()
  const day = date.getDay()
  const items = buildScheduleEntries()
    .filter((e) => e.slot.day === day)
    .filter((e) => {
      const p = input?.program ? e.section.program.toLowerCase() === input.program!.toLowerCase() : true
      const g = input?.group ? e.section.group.toLowerCase() === input.group!.toLowerCase() : true
      return p && g
    })
    .sort((a, b) => (a.slot.start < b.slot.start ? -1 : 1))
    .map((e) => ({
      text: toHuman(e),
      time: `${e.slot.start}-${e.slot.end}`,
      room: e.section.room,
    }))
  return items
}

export async function POST(req: Request) {
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // ignore
  }
  const text: string = (body?.text || body?.message || "").toString()
  const q = text.trim()
  const lower = q.toLowerCase()

  const ctxProgram: string | undefined = body?.program || undefined
  const ctxSemester: string | undefined = body?.semester || undefined
  const ctxName: string | undefined = body?.name || undefined

  const { program: parsedProgram, group: parsedGroup } = parseProgramGroup(lower)
  const { code, name } = parseCourseCodeOrName(q)
  const lecturer = parseLecturer(lower)
  const studentFromText = parseStudent(lower)

  const preferStudent = ctxName ? { id: undefined, name: ctxName } : studentFromText

  let derivedProgram = ctxProgram || parsedProgram
  let derivedGroup = parsedGroup
  if (preferStudent?.id || preferStudent?.name) {
    const { student: s } = getScheduleForStudent(preferStudent)
    if (s) {
      derivedProgram = derivedProgram || s.program
      derivedGroup = derivedGroup || s.group
    }
  }

  const assistant: any = {
    id: `asst-${Date.now()}`,
    role: "assistant",
    parts: [] as any[],
  }

  // Intent: current class
  if (/sekarang|saat ini|sedang berlangsung/i.test(lower)) {
    const result = getCurrentClass({ program: derivedProgram, group: derivedGroup })
    if (!result) {
      assistant.parts.push({
        type: "tool-findCurrentClass",
        state: "output-available",
        output: { found: false, message: "Tidak ada kuliah yang sedang berlangsung." },
      })
    } else {
      assistant.parts.push({
        type: "tool-findCurrentClass",
        state: "output-available",
        output: { found: true, entry: result, text: toHuman(result) },
      })
    }
    await maybeSummarizeWithAI(assistant, { q, ctxProgram: derivedProgram, ctxSemester, ctxName })
    return Response.json({ assistant })
  }

  // Intent: next class today
  if (/berikutnya|selanjutnya|next/i.test(lower)) {
    const result = getNextClass({ program: derivedProgram, group: derivedGroup })
    if (!result) {
      assistant.parts.push({
        type: "tool-findNextClass",
        state: "output-available",
        output: { found: false, message: "Tidak ada kuliah berikutnya hari ini." },
      })
    } else {
      assistant.parts.push({
        type: "tool-findNextClass",
        state: "output-available",
        output: { found: true, entry: result, text: toHuman(result) },
      })
    }
    await maybeSummarizeWithAI(assistant, { q, ctxProgram: derivedProgram, ctxSemester, ctxName })
    return Response.json({ assistant })
  }

  // Intent: today schedule (explicit or default fallback)
  if (/hari ini|today|jadwal hari ini/i.test(lower) || /jadwal/i.test(lower)) {
    if (lecturer) {
      const list = getScheduleForLecturer(lecturer)
      const items = list.map(toHuman)
      assistant.parts.push({
        type: "tool-lecturerSchedule",
        state: "output-available",
        output: { count: items.length, items },
      })
      await maybeSummarizeWithAI(assistant, { q, ctxProgram: derivedProgram, ctxSemester, ctxName })
      return Response.json({ assistant })
    }

    if (code || name) {
      const list = getScheduleByCourse({ code, name })
      const items = list.map(toHuman)
      assistant.parts.push({
        type: "tool-courseSchedule",
        state: "output-available",
        output: { count: items.length, items },
      })
      await maybeSummarizeWithAI(assistant, { q, ctxProgram: derivedProgram, ctxSemester, ctxName })
      return Response.json({ assistant })
    }

    if (preferStudent.id || preferStudent.name) {
      const { student: s, schedule } = getScheduleForStudent(preferStudent)
      if (!s) {
        assistant.parts.push({
          type: "tool-studentSchedule",
          state: "output-available",
          output: { found: false, message: "Mahasiswa tidak ditemukan." },
        })
      } else {
        assistant.parts.push({
          type: "tool-studentSchedule",
          state: "output-available",
          output: { found: true, student: s, count: schedule.length, items: schedule.map(toHuman) },
        })
      }
      await maybeSummarizeWithAI(assistant, { q, ctxProgram: derivedProgram, ctxSemester, ctxName })
      return Response.json({ assistant })
    }

    const items = todayItems({ program: derivedProgram, group: derivedGroup })
    if (items.length === 0) {
      assistant.parts.push({
        type: "tool-todaySchedule",
        state: "output-available",
        output: { count: 0, items: [], message: "Tidak ada mata kuliah hari ini." },
      })
    } else {
      assistant.parts.push({
        type: "tool-todaySchedule",
        state: "output-available",
        output: { count: items.length, items },
      })
    }
    await maybeSummarizeWithAI(assistant, { q, ctxProgram: derivedProgram, ctxSemester, ctxName })
    return Response.json({ assistant })
  }

  // Fallback: today schedule
  const items = todayItems({ program: derivedProgram, group: derivedGroup })
  if (items.length === 0) {
    assistant.parts.push({
      type: "tool-todaySchedule",
      state: "output-available",
      output: { count: 0, items: [], message: "Tidak ada mata kuliah hari ini." },
    })
  } else {
    assistant.parts.push({
      type: "tool-todaySchedule",
      state: "output-available",
      output: { count: items.length, items },
    })
  }
  await maybeSummarizeWithAI(assistant, { q, ctxProgram: derivedProgram, ctxSemester, ctxName })
  return Response.json({ assistant })
}

export async function GET() {
  return Response.json({
    status: "ok",
    usage:
      "POST { text: string } → returns assistant message with parts including tool outputs (today/current/next/course/lecturer/student).",
  })
}

async function maybeSummarizeWithAI(
  assistant: any,
  input: { q: string; ctxProgram?: string; ctxSemester?: string; ctxName?: string },
) {
  // Default: gunakan lokal saja kecuali USE_LOCAL_AI === "false"
  const useLocal = process.env.USE_LOCAL_AI !== "false"
  if (useLocal) {
    // Tambahkan ringkasan lokal yang deterministik
    const hint =
      input.ctxProgram || input.ctxSemester || input.ctxName
        ? ` (filter: ${[input.ctxProgram, input.ctxSemester, input.ctxName].filter(Boolean).join(", ")})`
        : ""
    assistant.parts.unshift({
      type: "text",
      text: `Berikut hasil pencarian jadwal${hint}.`,
    })
    return
  }

  try {
    const lastTool = assistant.parts.find((p: any) => typeof p?.type === "string" && p.type.startsWith("tool-"))
    const toolJson = lastTool ? JSON.stringify(lastTool.output).slice(0, 2000) : "[]"
    const { text } = await generateText({
      model: "openai/gpt-5-mini",
      prompt:
        `Ringkas jawaban jadwal berdasarkan data tool berikut dalam bahasa Indonesia yang singkat dan ramah.\n` +
        `Konteks pengguna: program=${input.ctxProgram ?? "-"}, semester=${input.ctxSemester ?? "-"}, nama=${input.ctxName ?? "-"}\n` +
        `Pertanyaan: ${input.q}\n` +
        `Data tool (JSON): ${toolJson}\n`,
    })
    assistant.parts.unshift({ type: "text", text })
  } catch {
    // Jika AI gagal (contoh: 403 gateway), fallback lokal
    assistant.parts.unshift({ type: "text", text: "Berikut hasil pencarian jadwal." })
  }
}
