import type { Metadata } from 'next'
import { AuthShell } from '../AuthShell'

export const metadata: Metadata = { title: 'เข้าสู่ระบบ' }

export default function LoginPage() {
  return <AuthShell mode="signin" />
}
