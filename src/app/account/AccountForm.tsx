'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  initialName: string
  initialPhone: string
}

export function AccountForm({ initialName, initialPhone }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setSavingProfile(true)
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || null, phone: phone.trim() || null }),
    })
    setSavingProfile(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setProfileMsg({ type: 'err', text: data?.error ?? '保存失败' })
      return
    }
    setProfileMsg({ type: 'ok', text: '已保存' })
    router.refresh()
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdMsg(null)
    if (newPassword.length < 8) {
      setPwdMsg({ type: 'err', text: '新密码至少 8 位' })
      return
    }
    setSavingPwd(true)
    const res = await fetch('/api/account/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setSavingPwd(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setPwdMsg({ type: 'err', text: data?.error ?? '修改失败' })
      return
    }
    setPwdMsg({ type: 'ok', text: '密码已更新' })
    setCurrentPassword('')
    setNewPassword('')
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">昵称</label>
          <input
            type="text"
            value={name}
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
            placeholder="昵称"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">手机号</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
            placeholder="选填，仅作联系方式"
          />
        </div>
        {profileMsg && (
          <div className={`text-sm ${profileMsg.type === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
            {profileMsg.text}
          </div>
        )}
        <button
          type="submit"
          disabled={savingProfile}
          className="px-4 py-2 text-sm bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {savingProfile ? '保存中...' : '保存资料'}
        </button>
      </form>

      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-medium mb-4">修改密码</h3>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">当前密码</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">新密码</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border focus:outline-none focus:border-foreground transition-colors"
              placeholder="至少 8 位"
            />
          </div>
          {pwdMsg && (
            <div className={`text-sm ${pwdMsg.type === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
              {pwdMsg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={savingPwd}
            className="px-4 py-2 text-sm bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {savingPwd ? '修改中...' : '修改密码'}
          </button>
        </form>
      </div>
    </div>
  )
}
