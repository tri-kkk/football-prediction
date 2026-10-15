'use client'

// Tap Champs 관리자: 게임 우편함으로 하트 보내기
// - Google 로그인(Firebase, 프로젝트 tap-champs). 보내기·지우기는 Firestore 규칙이 trikilab2025@gmail.com 만 허용
// - Firestore `mail/{id}`: title{ko,en}, body{ko,en}, hearts, country("" = 전체), start, expire
// - Firebase SDK 는 패키지 설치 없이 gstatic CDN(compat) 으로 불러옴

import { useEffect, useMemo, useState } from 'react'

const FB_VER = '10.14.1'
const FB_CONFIG = {
  apiKey: 'AIzaSyAMVrW9PEyNkG9MDhign4-u3_QtaXEa10M',
  authDomain: 'tap-champs.firebaseapp.com',
  projectId: 'tap-champs',
}
const ADMIN_EMAIL = 'trikilab2025@gmail.com'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    firebase?: any
  }
}

type Mail = {
  id: string
  title: Record<string, string>
  body: Record<string, string>
  hearts: number
  country: string
  start: Date | null
  expire: Date | null
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('load failed: ' + src))
    document.head.appendChild(s)
  })
}

async function loadFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}`
  await loadScript(`${base}/firebase-app-compat.js`)
  await loadScript(`${base}/firebase-auth-compat.js`)
  await loadScript(`${base}/firebase-firestore-compat.js`)
  const fb = window.firebase
  if (!fb.apps.length) fb.initializeApp(FB_CONFIG)
  return fb
}

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function fmt(d: Date | null) {
  if (!d) return '-'
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function TapChampsAdminPage() {
  const [fb, setFb] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [mails, setMails] = useState<Mail[]>([])
  const [busy, setBusy] = useState(false)

  const [titleKo, setTitleKo] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [bodyKo, setBodyKo] = useState('')
  const [bodyEn, setBodyEn] = useState('')
  const [hearts, setHearts] = useState(5)
  const [country, setCountry] = useState('')
  const [start, setStart] = useState(toLocalInput(new Date()))
  const [days, setDays] = useState(7)

  const isAdmin = useMemo(() => !!user && user.email === ADMIN_EMAIL && user.emailVerified, [user])

  useEffect(() => {
    let unsub: (() => void) | undefined
    loadFirebase()
      .then((f) => {
        setFb(f)
        unsub = f.auth().onAuthStateChanged((u: any) => setUser(u))
      })
      .catch((e) => setErr(String(e)))
    return () => unsub?.()
  }, [])

  const refresh = async () => {
    if (!fb) return
    const snap = await fb.firestore().collection('mail').orderBy('start', 'desc').limit(50).get()
    setMails(
      snap.docs.map((d: any) => {
        const v = d.data()
        return {
          id: d.id,
          title: v.title || {},
          body: v.body || {},
          hearts: v.hearts || 0,
          country: v.country || '',
          start: v.start ? v.start.toDate() : null,
          expire: v.expire ? v.expire.toDate() : null,
        }
      })
    )
  }

  useEffect(() => {
    if (fb) refresh().catch((e) => setErr(String(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fb])

  const signIn = async () => {
    setErr('')
    try {
      await fb.auth().signInWithPopup(new fb.auth.GoogleAuthProvider())
    } catch (e) {
      setErr(String(e))
    }
  }

  const send = async () => {
    setErr('')
    setMsg('')
    if (!titleKo.trim() || !titleEn.trim()) {
      setErr('제목(한국어·영어)을 모두 입력하세요.')
      return
    }
    if (hearts < 0 || hearts > 99) {
      setErr('하트는 0~99개까지 보낼 수 있어요.')
      return
    }
    const s = new Date(start)
    const e = new Date(s.getTime() + days * 86400000)
    const cc = country.trim().toUpperCase()
    if (cc && cc.length !== 2) {
      setErr('나라는 비워두거나(전체) 2글자 코드로 입력하세요. 예: KR, JP, ID')
      return
    }
    setBusy(true)
    try {
      const T = fb.firestore.Timestamp
      await fb.firestore().collection('mail').add({
        title: { ko: titleKo.trim(), en: titleEn.trim() },
        body: { ko: bodyKo.trim(), en: bodyEn.trim() },
        hearts: Math.floor(hearts),
        country: cc,
        start: T.fromDate(s),
        expire: T.fromDate(e),
      })
      setMsg(`보냈습니다: ${titleKo} (하트 ${hearts}개, ${cc || '전체'}, ${fmt(e)}까지)`)
      setTitleKo('')
      setTitleEn('')
      setBodyKo('')
      setBodyEn('')
      await refresh()
    } catch (x) {
      setErr('보내기 실패: ' + String(x))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (m: Mail) => {
    if (!window.confirm(`"${m.title.ko || m.title.en}" 우편을 지울까요? 아직 안 받은 사람은 더 이상 받을 수 없어요.`)) return
    try {
      await fb.firestore().collection('mail').doc(m.id).delete()
      await refresh()
    } catch (x) {
      setErr('지우기 실패: ' + String(x))
    }
  }

  const now = Date.now()
  const input = 'w-full bg-[#111] border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500'

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-10">
      <div className="container mx-auto px-4 max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tap Champs 우편 보내기</h1>
          {user ? (
            <div className="text-sm text-gray-400 flex items-center gap-3">
              <span>{user.email}</span>
              <button onClick={() => fb.auth().signOut()} className="text-gray-500 hover:text-white">로그아웃</button>
            </div>
          ) : (
            <button onClick={signIn} disabled={!fb} className="bg-white text-black font-semibold rounded-lg px-4 py-2 disabled:opacity-50">
              Google로 로그인
            </button>
          )}
        </div>

        {user && !isAdmin && (
          <p className="text-red-400">이 계정은 관리자가 아니에요. {ADMIN_EMAIL} 로 로그인하세요.</p>
        )}
        {err && <p className="text-red-400 text-sm break-all">{err}</p>}
        {msg && <p className="text-emerald-400 text-sm">{msg}</p>}

        {isAdmin && (
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-sm text-gray-400">제목 (한국어) *</span>
                <input className={input} value={titleKo} onChange={(e) => setTitleKo(e.target.value)} placeholder="추석 선물" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-gray-400">제목 (영어) * — 다른 언어는 영어로 보임</span>
                <input className={input} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="Holiday gift" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-gray-400">내용 (한국어)</span>
                <textarea className={input} rows={2} value={bodyKo} onChange={(e) => setBodyKo(e.target.value)} placeholder="하트 5개를 드려요!" />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-gray-400">내용 (영어)</span>
                <textarea className={input} rows={2} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} placeholder="5 hearts for you!" />
              </label>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <label className="space-y-1">
                <span className="text-sm text-gray-400">하트 개수</span>
                <input type="number" min={0} max={99} className={input} value={hearts} onChange={(e) => setHearts(Number(e.target.value))} />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-gray-400">나라 (비우면 전체)</span>
                <input className={input} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="KR" maxLength={2} />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-gray-400">보이기 시작</span>
                <input type="datetime-local" className={input} value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-gray-400">유효 기간(일)</span>
                <input type="number" min={1} max={365} className={input} value={days} onChange={(e) => setDays(Number(e.target.value))} />
              </label>
            </div>
            <button onClick={send} disabled={busy} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl py-3 disabled:opacity-50">
              {busy ? '보내는 중…' : '우편 보내기'}
            </button>
            <p className="text-xs text-gray-500">
              받은 사람은 같은 우편을 다시 받을 수 없고, 기간이 지나면 우편함에서 사라집니다. 앱에는 보통 앱을 다시 켜거나 우편함을 열 때 나타납니다.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">보낸 우편 (최근 50개)</h2>
            <button onClick={() => refresh().catch((e) => setErr(String(e)))} className="text-sm text-gray-400 hover:text-white">새로고침</button>
          </div>
          {mails.length === 0 && <p className="text-gray-500 text-sm">아직 보낸 우편이 없어요.</p>}
          {mails.map((m) => {
            const status = m.start && m.start.getTime() > now ? '예약' : m.expire && m.expire.getTime() <= now ? '끝남' : '진행 중'
            const color = status === '진행 중' ? 'text-emerald-400' : status === '예약' ? 'text-yellow-400' : 'text-gray-500'
            return (
              <div key={m.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{m.title.ko || m.title.en} <span className="text-gray-500 font-normal">/ {m.title.en}</span></p>
                  <p className="text-sm text-gray-400 truncate">{m.body.ko || m.body.en}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    하트 {m.hearts} · {m.country || '전체'} · {fmt(m.start)} ~ {fmt(m.expire)} · <span className={color}>{status}</span>
                  </p>
                </div>
                {isAdmin && (
                  <button onClick={() => remove(m)} className="text-sm text-red-400 hover:text-red-300 shrink-0">지우기</button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
