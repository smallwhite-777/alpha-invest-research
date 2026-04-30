import { NextRequest, NextResponse } from 'next/server'
import { consumeVerificationToken } from '@/lib/email-verification'

function redirect(reason: 'success' | 'expired' | 'invalid' | 'not_found' | 'no_user' | 'error', request: NextRequest) {
  const url = new URL('/login', request.url)
  if (reason === 'success') {
    url.searchParams.set('verified', '1')
  } else {
    url.searchParams.set('verifyError', reason)
  }
  return NextResponse.redirect(url, 303)
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  if (!token) return redirect('invalid', request)

  try {
    const result = await consumeVerificationToken(token)
    if (result.ok) return redirect('success', request)
    if (result.reason === 'expired') return redirect('expired', request)
    if (result.reason === 'not_found' || result.reason === 'no_user') {
      return redirect('not_found', request)
    }
    return redirect('invalid', request)
  } catch (err) {
    console.error('[verify] error:', err)
    return redirect('error', request)
  }
}
