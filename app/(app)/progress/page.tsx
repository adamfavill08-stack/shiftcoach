import { redirect } from 'next/navigation'

/** Browse hub removed; bottom nav opens Settings directly. Keep /progress as a redirect for old links. */
export default function ProgressRedirectPage() {
  redirect('/settings')
}
