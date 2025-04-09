import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set: (name, value, options) => {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // The `set` method might be called during a server component render
            // This can be ignored if you have middleware refreshing sessions
          }
        },
        remove: (name, options) => {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // The `remove` method might be called during a server component render
            // This can be ignored if you have middleware refreshing sessions
          }
        }
      },
    }
  )
}