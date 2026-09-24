import type { Metadata } from 'next'
import { AuthShell } from '../AuthShell'

export const metadata: Metadata = { title: 'สมัครใหม่' }

export default function SignupPage() {
  return <AuthShell mode="signup" />
}
