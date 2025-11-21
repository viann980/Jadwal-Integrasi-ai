"use client"

import useSWR from "swr"
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ClassInfo = {
  code: string
  name: string
  lecturer: string
  room: string
  start: string
  end: string
  status?: string
  lecturerPresent?: boolean
  day?: string
  predictionWarning?: string | null
  predictionProbability?: number
}

type ScheduleResponse = {
  now: string
  student: { id: string; name: string; major: string; semester: number }
  currentClass: ClassInfo | null
  nextClass: ClassInfo | null
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STUDENTS = [
  { id: "S001", name: "Andi", major: "Informatika", semester: 3 },
  { id: "S002", name: "Budi", major: "Sistem Informasi", semester: 3 },
]

export default function ScheduleDashboard() {
  const [studentId, setStudentId] = useState("S001")

  const { data, isLoading } = useSWR<ScheduleResponse>(
    `/api/schedule?studentId=${encodeURIComponent(studentId)}`,
    fetcher,
    { refreshInterval: 30_000 }, // refresh setiap 30 detik
  )

  const selected = useMemo(() => STUDENTS.find((s) => s.id === studentId) ?? STUDENTS[0], [studentId])

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-balance text-sm text-muted-foreground">
            Pilih mahasiswa untuk melihat jadwal yang dipersonalisasi berdasarkan Jurusan dan Semester.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={studentId} onValueChange={(v) => setStudentId(v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Pilih Mahasiswa" />
            </SelectTrigger>
            <SelectContent>
              {STUDENTS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="secondary">
            <a
              href={`/api/export?studentId=${encodeURIComponent(studentId)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ekspor ke Spreadsheet
            </a>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">KULIAH SAAT INI</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Memuat status saat ini...</p>
            ) : !data?.currentClass ? (
              <p className="text-muted-foreground">Tidak ada kuliah saat ini.</p>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">{data.currentClass.name}</p>
                <p className="text-sm text-muted-foreground">
                  Waktu: {data.currentClass.start} - {data.currentClass.end} • Ruangan: {data.currentClass.room}
                </p>
                <p className="text-sm">
                  Status: <span className="font-medium">{data.currentClass.status ?? "Tidak ada data"}</span>{" "}
                  {typeof data.currentClass.lecturerPresent === "boolean" && (
                    <span className="text-muted-foreground">
                      — Dosen {data.currentClass.lecturerPresent ? "Telah Hadir" : "Belum Hadir"}
                    </span>
                  )}
                </p>
                {!!data.currentClass.predictionWarning && (
                  <p className="text-sm text-destructive">{data.currentClass.predictionWarning}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-pretty">KULIAH BERIKUTNYA</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Memuat kuliah berikutnya...</p>
            ) : !data?.nextClass ? (
              <p className="text-muted-foreground">Tidak ada jadwal berikutnya untuk hari ini.</p>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">{data.nextClass.name}</p>
                <p className="text-sm text-muted-foreground">
                  {data.nextClass.day ? `${data.nextClass.day}, ` : ""}
                  {data.nextClass.start} di Ruangan: {data.nextClass.room}
                </p>
                {!!data.nextClass.predictionWarning && (
                  <p className="text-sm text-destructive">{data.nextClass.predictionWarning}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <footer className="text-xs text-muted-foreground">
        {data?.now ? `Terakhir diperbarui: ${data.now}` : null} • {selected.name} • {selected.major} (Semester{" "}
        {selected.semester})
      </footer>
    </div>
  )
}
