import { redirect } from 'next/navigation'

/** @deprecated Use /settings (and /settings/profile for account details). */
export default function ProfileRedirectPage() {
  redirect('/settings')
}
