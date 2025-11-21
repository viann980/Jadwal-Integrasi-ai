"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

type Part =
  | { type: "text"; text: string }
  | {
      type: string // e.g. "tool-todaySchedule" | "tool-findCurrentClass" ...
      state: "input-available" | "output-available" | "output-error"
      output?: any
    }

type Message = {
  id: string
  role: "user" | "assistant"
  parts: Part[]
}

export default function ScheduleChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<"idle" | "in_progress">("idle")
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const params = useSearchParams()
  const program = params.get("program") || undefined
  const semester = params.get("semester") || undefined
  const name = params.get("name") || undefined

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", parts: [{ type: "text", text }] }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setStatus("in_progress")

    try {
      const res = await fetch("/api/schedule-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, program, semester, name }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data = await res.json()
      const assistant: Message = data.assistant
      setMessages((prev) => [...prev, assistant])
    } catch (err) {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Maaf, terjadi kesalahan memproses permintaan. Silakan coba lagi atau periksa koneksi jaringan Anda.",
          },
        ],
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setStatus("idle")
    }
  }

  return (
    <main className="min-h-dvh flex flex-col">
      {/* Header Chat */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-border">
              <img src="/jadwalai-logo.jpg" alt="Logo JadwalAI" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-semibold">JadwalAI</h1>
              <p className="text-xs text-muted-foreground">Tanyakan jadwal mata kuliah hari ini</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs">
            {program && <span className="px-2 py-1 rounded bg-muted">Jurusan: {program}</span>}
            {semester && <span className="px-2 py-1 rounded bg-muted">Semester: {semester}</span>}
            {name && <span className="px-2 py-1 rounded bg-muted">Nama: {name}</span>}
          </div>
        </div>
      </header>

      {/* Area Pesan */}
      <div ref={scrollRef} className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-4 md:py-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-md text-center text-sm text-muted-foreground space-y-2">
            <p>Contoh pertanyaan:</p>
            <ul className="list-disc list-inside text-left">
              <li>{"Ada kuliah untuk Informatika A sekarang?"}</li>
              <li>{"Apa kuliah berikutnya untuk Informatika A?"}</li>
              <li>{"Tampilkan jadwal IF101 hari ini."}</li>
              <li>{"Jadwal Bu Rani hari ini?"}</li>
            </ul>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role} parts={msg.parts} />
          ))}
        </div>
      </div>

      {/* Input Chat */}
      <form className="sticky bottom-0 border-t bg-background/80 backdrop-blur" onSubmit={onSend}>
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-2">
          <input
            className="flex-1 bg-background border rounded-md px-3 py-2 outline-none"
            placeholder="Tulis pertanyaan Anda…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status === "in_progress"}
            aria-label="Pertanyaan"
          />
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            disabled={status === "in_progress" || !input.trim()}
            type="submit"
          >
            Kirim
          </button>
        </div>
      </form>
    </main>
  )
}

function MessageBubble({ role, parts }: { role: string; parts: any[] }) {
  const isUser = role === "user"
  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-border shrink-0">
          <img src="/jadwalai-logo.jpg" alt="Avatar Asisten" className="h-full w-full object-cover" />
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "text-right" : "text-left"}`}>
        {parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <p
                key={i}
                className={`px-3 py-2 rounded-2xl leading-relaxed ${
                  isUser ? "bg-primary text-primary-foreground ml-auto" : "bg-muted text-foreground mr-auto"
                }`}
              >
                {part.text}
              </p>
            )
          }

          if (typeof part.type === "string" && part.type.startsWith("tool-")) {
            if (part.state === "input-available") {
              return (
                <div key={i} className="px-3 py-2 rounded-2xl bg-muted text-muted-foreground mr-auto">
                  Memproses permintaan…
                </div>
              )
            }
            if (part.state === "output-error") {
              return (
                <div
                  key={i}
                  role="alert"
                  className="px-3 py-2 rounded-2xl bg-destructive text-destructive-foreground mr-auto"
                >
                  Terjadi kesalahan pada tool.
                </div>
              )
            }
            if (part.state === "output-available") {
              return <ToolOutput key={i} output={part.output} />
            }
          }

          return (
            <pre key={i} className="px-3 py-2 rounded-2xl bg-muted text-foreground mr-auto overflow-auto">
              {JSON.stringify(part, null, 2)}
            </pre>
          )
        })}
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-border shrink-0">
          <img src="/diverse-user-avatars.png" alt="Avatar Anda" className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  )
}

function ToolOutput({ output }: { output: any }) {
  const isEmpty = output?.found === false || (typeof output?.count === "number" && output.count === 0)

  if (isEmpty) {
    return (
      <div role="alert" className="px-3 py-2 rounded-2xl bg-destructive text-destructive-foreground mr-auto">
        {output?.message || "Tidak ada mata kuliah hari ini."}
      </div>
    )
  }

  if (output?.entry || output?.text) {
    const t = output?.text as string | undefined
    const e = output?.entry
    return (
      <div className="mr-auto space-y-2">
        {t && <div className="px-3 py-2 rounded-2xl bg-muted text-foreground">{t}</div>}
        {e?.slot && (
          <div className="px-3 py-2 rounded-2xl bg-card text-card-foreground ring-1 ring-border">
            <div className="text-sm font-medium">
              {e?.course?.code} {e?.course?.name}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {e?.section?.program}-{e?.section?.group} • {e?.section?.lecturer} • Ruang {e?.section?.room}
            </div>
            <div className="text-xs mt-1">
              {weekday(e?.slot?.day)} {e?.slot?.start}–{e?.slot?.end}
            </div>
          </div>
        )}
      </div>
    )
  }

  const items = Array.isArray(output?.items) ? output.items : []
  if (items.length > 0) {
    return (
      <div className="mr-auto grid gap-2">
        {items.map((it: any, idx: number) => {
          const text = typeof it === "string" ? it : it?.text
          const time = it?.time
          const room = it?.room
          return (
            <div key={idx} className="px-3 py-2 rounded-2xl bg-card text-card-foreground ring-1 ring-border">
              <div className="text-sm">{text}</div>
              {(time || room) && (
                <div className="text-xs text-muted-foreground mt-1">
                  {time ? <span>Waktu: {time}</span> : null}
                  {time && room ? <span>{" • "}</span> : null}
                  {room ? <span>Ruang: {room}</span> : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <pre className="px-3 py-2 rounded-2xl bg-muted text-foreground mr-auto overflow-auto">
      {JSON.stringify(output, null, 2)}
    </pre>
  )
}

function weekday(d?: number) {
  return ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][d ?? 0] ?? ""
}
