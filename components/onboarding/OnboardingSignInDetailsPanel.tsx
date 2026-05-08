"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import { User, Mail, Lock, Eye, EyeOff, X, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { buildEmailConfirmationRedirectTo } from "@/lib/auth/oauthRedirect"

const TEAL = "#149191"
/** Bottom Back / Next bar — brand cyan from welcome CTA */
const PILL_BG = "#05afc5"
const PAGE_BG = "var(--bg)"
const CARD_BG = "var(--card)"
const CARD_BORDER = "var(--border-subtle)"
const TEXT_MAIN = "var(--text-main)"
const TEXT_SOFT = "var(--text-soft)"
type OnboardingSignInDetailsPanelProps = {
  persistDraft: () => void
  onSuccess: () => void
  onBack: () => void
}

function RowInput({
  icon: Icon,
  children,
  isLast,
}: {
  icon: typeof User
  children: ReactNode
  isLast?: boolean
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 52,
        borderBottom: isLast ? "none" : `1px solid ${CARD_BORDER}`,
      }}
    >
      <div style={{ width: 48, display: "flex", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} strokeWidth={2} color={TEAL} aria-hidden />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

export function OnboardingSignInDetailsPanel({
  persistDraft,
  onSuccess,
  onBack,
}: OnboardingSignInDetailsPanelProps) {
  const formId = "onboarding-sign-in-details-form"
  const [firstName, setFirstName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(undefined)

    const fn = firstName.trim()
    if (fn.length < 3) {
      setErr("Please enter your first name (at least 3 characters).")
      return
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.")
      return
    }

    setBusy(true)
    const emailRedirectTo = buildEmailConfirmationRedirectTo()

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
        data: {
          name: fn,
          first_name: fn,
        },
      },
    })

    if (error) {
      setBusy(false)
      setErr(error.message)
      return
    }

    if (!data.session) {
      persistDraft()
      setBusy(false)
      setErr(
        "No active session yet. If your project requires email confirmation, open the link in your email, then come back and sign in to finish setup."
      )
      return
    }

    persistDraft()
    setBusy(false)
    onSuccess()
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: PAGE_BG,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          minHeight: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            padding: "calc(8px + env(safe-area-inset-top, 0px)) 20px 16px",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onBack}
            aria-label="Close"
            style={{
              position: "absolute",
              right: 16,
              top: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              lineHeight: 0,
              color: TEAL,
            }}
          >
            <X size={22} strokeWidth={2.5} aria-hidden />
          </button>
          <h2
            style={{
              textAlign: "center",
              fontSize: 17,
              fontWeight: 600,
              color: TEXT_MAIN,
              margin: "12px 40px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Sign in details
          </h2>
        </div>

        <div style={{ padding: "0 20px 24px" }}>
          <form id={formId} onSubmit={submit}>
          <div
            style={{
              background: CARD_BG,
              borderRadius: 16,
              overflow: "hidden",
              border: `1px solid ${CARD_BORDER}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <RowInput icon={User}>
              <input
                name="firstName"
                autoComplete="given-name"
                placeholder="First name (min. 3 characters)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={busy}
                required
                minLength={3}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  fontSize: 16,
                  padding: "14px 16px 14px 0",
                  fontFamily: "Inter, sans-serif",
                  color: TEXT_MAIN,
                  background: "transparent",
                }}
              />
            </RowInput>
            <RowInput icon={Mail}>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                required
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  fontSize: 16,
                  padding: "14px 16px 14px 0",
                  fontFamily: "Inter, sans-serif",
                  color: TEXT_MAIN,
                  background: "transparent",
                }}
              />
            </RowInput>
            <RowInput icon={Lock} isLast>
              <div style={{ display: "flex", alignItems: "center", paddingRight: 12 }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  required
                  minLength={6}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    outline: "none",
                    fontSize: 16,
                    padding: "14px 8px 14px 0",
                    fontFamily: "Inter, sans-serif",
                    color: TEXT_MAIN,
                    background: "transparent",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={busy}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 8,
                    lineHeight: 0,
                    color: TEAL,
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </RowInput>
          </div>

          <div style={{ marginTop: 20, marginBottom: 8, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 9999,
                padding: "10px 16px 10px 14px",
                maxWidth: "100%",
                background: "rgba(5, 175, 197, 0.14)",
                border: "1px solid rgba(5, 175, 197, 0.38)",
                color: TEXT_SOFT,
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.35,
                letterSpacing: "-0.01em",
              }}
            >
              <ShieldCheck size={22} strokeWidth={2.25} color={PILL_BG} aria-hidden style={{ flexShrink: 0 }} />
              <span>ShiftCoach is trusted by shiftworkers worldwide.</span>
            </div>
          </div>

          {err && (
            <p style={{ color: "#C62828", fontSize: 13, marginTop: 8, marginBottom: 0 }} role="alert">
              {err}
            </p>
          )}
          </form>
        </div>
      </div>

      <div
        style={{
          padding: "12px 20px calc(12px + env(safe-area-inset-bottom, 0px))",
          background: PAGE_BG,
          flexShrink: 0,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.14)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: PILL_BG,
            borderRadius: 9999,
            padding: "16px 28px",
            boxShadow: "0 8px 24px rgba(5,175,197,0.45)",
          }}
        >
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: busy ? "default" : "pointer",
              fontFamily: "Inter, sans-serif",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Back
          </button>
          <button
            type="submit"
            form={formId}
            disabled={busy}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
              fontFamily: "Inter, sans-serif",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Please wait…" : "Next"}
          </button>
        </div>
      </div>
    </div>
  )
}
