import { useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, onAuthStateChanged, sendSignInLinkToEmail } from 'firebase/auth'

const firebaseConfig = {
  apiKey:     import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
}

const ADMIN_EMAIL = 'whyiswhen@gmail.com'

export default function PrivateGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authed' | 'unauthed' | 'wrong-user'>('loading')

  useEffect(() => {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) setStatus('unauthed')
      else if (user.email !== ADMIN_EMAIL) setStatus('wrong-user')
      else setStatus('authed')
    })
    return unsub
  }, [])

  if (status === 'loading') return <div style={{padding:'40px',color:'#938F99'}}>Checking access…</div>
  if (status === 'unauthed') { window.location.replace('/login'); return null }
  if (status === 'wrong-user') return <div style={{padding:'40px',color:'#F2B8B5'}}>Access denied. This page is private.</div>
  return <>{children}</>
}
