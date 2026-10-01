// The portal's home page deliberately does NOT list vacancies. Each job is
// shared on its own through its link (/jobs/<slug>) from the admin portal,
// so a candidate who opens the bare domain doesn't see every open role.
export default function Home() {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center"
      style={{ background: "#F6F4EE" }}
    >
      <img src="/mascot-full.png" alt="Rabbit Mart" style={{ height: 72 }} />
      <h1 className="text-2xl font-black" style={{ color: "#0B3D2E" }}>
        وظائف Rabbit Mart
      </h1>
      <p className="text-sm" style={{ color: "#5b6b66", maxWidth: 340, lineHeight: 1.8 }}>
        للتقديم على وظيفة، افتح لينك الوظيفة اللي وصلك في إعلان التوظيف.
      </p>
    </div>
  );
}
