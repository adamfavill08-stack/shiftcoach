"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function WelcomePage() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  const anim = (delay = 0): React.CSSProperties => ({
    opacity:    visible ? 1 : 0,
    transform:  visible ? "translateY(0)" : "translateY(16px)",
    transition: `opacity 0.6s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.6s cubic-bezier(.16,1,.3,1) ${delay}s`,
  })

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      fontFamily: "Inter, sans-serif",
      color: "var(--text-main)",
    }}>

      {/* Heading */}
      <div style={{ textAlign: "center", maxWidth: 320, ...anim(0) }}>
        <div style={{
          fontSize: 28, fontWeight: 300, lineHeight: 1.2,
          color: "var(--text-main)", marginBottom: 12,
        }}>
          Your shift pattern<br />is set up
        </div>
        <div style={{
          fontSize: 14, color: "var(--text-soft)", fontWeight: 300,
          lineHeight: 1.6, marginBottom: 32,
        }}>
          ShiftCoach now understands your rotation. Your body clock analysis,
          fatigue risk and personalised recommendations will build over the
          first week as your data comes in.
        </div>
      </div>

      {/* What to expect cards */}
      <div style={{
        width: "100%", maxWidth: 360,
        display: "flex", flexDirection: "column", gap: 10,
        marginBottom: 32,
        ...anim(0.2),
      }}>
        {[
          {
            icon: "◑",
            color: "#00BCD4",
            title: "Body Clock Analysis",
            desc: "Live on your dashboard — updates as you log sleep.",
          },
          {
            icon: "⚡",
            color: "#F59E0B",
            title: "Fatigue Risk",
            desc: "Tracks your risk window based on your shift and sleep data.",
          },
          {
            icon: "🔥",
            color: "#EF4444",
            title: "Adjusted Calories",
            desc: "Add your health details in settings to unlock personalised targets.",
          },
        ].map(({ icon, color, title, desc }) => (
          <div key={title} style={{
            background: "var(--card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: color + "18",
              border: `1px solid ${color}30`,
              display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 16, flexShrink: 0,
            }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--text-soft)", fontWeight: 300, lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ width: "100%", maxWidth: 360, ...anim(0.3) }}>
        <button
          onClick={() => {
            sessionStorage.removeItem("fromOnboarding")
            router.push("/dashboard")
          }}
          style={{
            width: "100%", padding: "16px",
            background: "#00BCD4", color: "#000",
            border: "none", borderRadius: 14,
            fontSize: 15, fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.3px", cursor: "pointer",
            transition: "opacity 0.2s ease",
          }}
        >
          Go to dashboard →
        </button>

        <div style={{
          fontSize: 11, color: "var(--text-muted)",
          textAlign: "center", marginTop: 12,
        }}>
          You can update your shift pattern anytime in settings.
        </div>
      </div>

    </div>
  )
}


