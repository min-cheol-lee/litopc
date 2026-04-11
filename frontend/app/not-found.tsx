import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at 20% 20%, #0d1b2e 0%, #07111f 60%, #04090f 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-inter, Inter, system-ui, sans-serif)",
      color: "rgba(200, 220, 255, 0.85)",
      padding: "2rem",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "5rem", fontWeight: 700, letterSpacing: "-0.04em", color: "rgba(120, 180, 255, 0.25)", lineHeight: 1 }}>
        404
      </div>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 600, margin: "1.25rem 0 0.5rem", color: "rgba(200, 220, 255, 0.9)" }}>
        Page not found
      </h1>
      <p style={{ fontSize: "0.95rem", color: "rgba(160, 190, 230, 0.6)", marginBottom: "2rem", maxWidth: 380 }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/"
          style={{
            padding: "0.55rem 1.2rem",
            borderRadius: 8,
            background: "rgba(10, 132, 255, 0.15)",
            border: "1px solid rgba(10, 132, 255, 0.35)",
            color: "rgba(120, 180, 255, 0.95)",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          ← Home
        </Link>
        <Link
          href="/litopc"
          style={{
            padding: "0.55rem 1.2rem",
            borderRadius: 8,
            background: "rgba(10, 132, 255, 0.22)",
            border: "1px solid rgba(10, 132, 255, 0.5)",
            color: "rgba(160, 210, 255, 0.95)",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          Open Simulator →
        </Link>
      </div>
    </div>
  );
}
