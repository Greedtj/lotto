import { NextResponse, type NextRequest } from 'next/server'

// Optimistic check only (cookie present). Pages still verify the session on the server.
export function proxy(request: NextRequest) {
  if (!request.cookies.has('lotto_session')) return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!login|api|_next|icon.svg|favicon.ico).*)'],
}
