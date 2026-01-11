/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Socket } from 'socket.io-client'

import { api } from '../lib/api'
import { connectSocket } from '../lib/socket'

export type Role = 'MANAGER' | 'DRIVER' | 'CUSTOMER'
export type DriverApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type User = {
  id: string
  _id?: string // For backward compatibility if needed
  name: string
  email: string
  phone: string
  role: Role
  driverApprovalStatus?: DriverApprovalStatus
  onboardingStatus?: string
  bankDetails?: {
    accountNumber?: string
    ifscCode?: string
    bankName?: string
    holderName?: string
  }
  performanceRating?: number
  awards?: string[]
  licenseNumber?: string
  createdAt?: string
}

type RegisterPayload = {
  name: string
  email: string
  phone: string
  password: string
  role: Role
}

type AuthContextValue = {
  token: string | null
  user: User | null
  socket: Socket | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (payload: RegisterPayload) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as User) : null
  })
  const [isLoading, setIsLoading] = useState(true)

  const [socket, setSocket] = useState<Socket | null>(null)

  // Verify session on mount
  useEffect(() => {
    async function init() {
      const savedToken = localStorage.getItem('token')
      if (!savedToken) {
        setIsLoading(false)
        return
      }

      try {
        const res = await api.get('/auth/me')
        const { user: u } = res.data
        setUser(u)
        localStorage.setItem('user', JSON.stringify(u))
      } catch (err) {
        console.error('Session verification failed:', err)
        logout()
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!token) {
      socket?.disconnect()
      setSocket(null)
      return
    }

    socket?.disconnect()
    const s = connectSocket(token)
    setSocket(s)

    return () => {
      s.disconnect()
      setSocket(null)
    }
    // Intentionally ignore `socket` to avoid re-connecting in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email: email.trim(), password })
    const { token: t, user: u } = res.data
    // Ensure id is present
    if (!u.id && u._id) u.id = u._id

    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
    setToken(t)
    setUser(u)
    return u
  }

  async function register(payload: RegisterPayload) {
    const res = await api.post('/auth/register', { ...payload, email: payload.email.trim(), phone: payload.phone.trim() })
    const { token: t, user: u } = res.data
    // Ensure id is present; backend returns `id` mapped from `_id`
    if (!u.id && u._id) u.id = u._id

    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
    setToken(t)
    setUser(u)
    return u
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, socket, isLoading, login, register, logout }),
    [token, user, socket, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
