// Shown instantly while the job page loads, so candidates opening a job-ad
// link see something straight away instead of a blank screen.
export default function Loading() {
  return (
    <div
      dir="rtl"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "#F6F4EE" }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          border: "3px solid #0B3D2E",
          borderRightColor: "transparent",
          borderRadius: "50%",
          animation: "rm-spin 0.7s linear infinite",
        }}
      />
      <div style={{ color: "#0B3D2E", fontWeight: 700, fontSize: 14 }}>جاري تحميل الوظيفة…</div>
      <style>{`@keyframes rm-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
