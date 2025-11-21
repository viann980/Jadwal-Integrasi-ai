export default function Page() {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="px-4 py-4 md:px-6">{/* ... bisa menambahkan nav jika diperlukan ... */}</header>

      <section className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-xl mx-auto space-y-6">
          {/* Logo profil produk */}
          <div className="mx-auto h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden ring-1 ring-border">
            {/* Menggunakan placeholder image sesuai pedoman */}
            {/* alt diberikan untuk aksesibilitas */}
            <img src="/kampus-schedule-ai-logo.jpg" alt="Logo JadwalAI" className="h-full w-full object-cover" />
          </div>

          {/* Nama produk */}
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-balance">JadwalAI</h1>
            <p className="text-muted-foreground mt-2 text-pretty">
              Asisten chatbot AI untuk menanyakan jadwal mata kuliah harian dengan informasi jam dan ruangan.
            </p>
          </div>

          {/* Tombol CTA */}
          <div>
            <form action="/schedule-chat" method="GET" className="grid gap-3 max-w-md mx-auto text-left">
              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">Jurusan</span>
                <select
                  name="program"
                  className="bg-background border rounded-md px-3 py-2"
                  aria-label="Pilih jurusan"
                  defaultValue="Informatika"
                >
                  <option>Informatika</option>
                  <option>Sistem Informasi</option>
                  <option>Teknik Komputer</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">Semester</span>
                <select
                  name="semester"
                  className="bg-background border rounded-md px-3 py-2"
                  aria-label="Pilih semester"
                  defaultValue="1"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                  <option value="7">Semester 7</option>
                  <option value="8">Semester 8</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm text-muted-foreground">Nama</span>
                <input
                  name="name"
                  placeholder="Nama mahasiswa"
                  className="bg-background border rounded-md px-3 py-2"
                  aria-label="Nama mahasiswa"
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-primary-foreground font-medium"
                aria-label="Mulai gunakan JadwalAI"
              >
                Let&apos;s go
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer className="px-4 py-6 text-center text-sm text-muted-foreground">
        Dibuat untuk membantu penjadwalan kampus secara real-time.
      </footer>
    </main>
  )
}
