import { Camera, Check, LoaderCircle, UserRound, X } from "lucide-react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { setUserdata } from "../redux/userSlice"
import { updateProfile } from "../features/updateProfile"

function ProfileDrawer({ open, onClose }) {
  const { userData } = useSelector(state => state.user)
  const dispatch = useDispatch()
  const [name, setName] = useState(userData?.name || "")
  const [avatar, setAvatar] = useState(userData?.avatar || "")
  const [customInstructions, setCustomInstructions] = useState(userData?.customInstructions || "")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!open) return null

  const handleSave = async event => {
    event.preventDefault()
    setError("")
    setSaved(false)
    setSaving(true)
    try {
      const updated = await updateProfile({ name, avatar, customInstructions })
      dispatch(setUserdata(updated))
      setSaved(true)
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update your profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button aria-label="Close profile" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="profile-title" className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-white/10 bg-[#0f1117] shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#0f1117] p-5">
          <div><h2 id="profile-title" className="text-lg font-semibold text-white">Profile</h2><p className="mt-1 text-xs text-slate-500">Update your account details here.</p></div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>
        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
          <div className="flex flex-col items-center gap-3 py-3">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
              {avatar ? <img src={avatar} alt="Profile preview" className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = "none" }} /> : <UserRound className="text-slate-500" size={30} />}
            </div>
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><Camera size={13} /> Upload a photo or add its link</span>
          </div>
          <label className="flex flex-col gap-2 text-sm text-slate-300">Name
            <input required maxLength={80} value={name} onChange={event => setName(event.target.value)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">Photo URL
            <input type="text" value={avatar} onChange={event => setAvatar(event.target.value)} placeholder="https://example.com/photo.jpg" className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">Upload photo
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => {
              const file = event.target.files?.[0]
              if (!file) return
              if (file.size > 2 * 1024 * 1024) { setError("Photo must be smaller than 2 MB."); event.target.value = ""; return }
              const reader = new FileReader()
              reader.onload = () => { setAvatar(String(reader.result || "")); setError("") }
              reader.onerror = () => setError("Could not read the photo.")
              reader.readAsDataURL(file)
            }} className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-slate-200" />
            <span className="text-[11px] text-slate-600">PNG, JPG, WEBP, or GIF; maximum 2 MB.</span>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">Custom instructions
            <textarea maxLength={2000} rows={4} value={customInstructions} onChange={event => setCustomInstructions(event.target.value)} placeholder="Example: Give concise answers; write code in JavaScript." className="resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500" />
            <span className="text-[11px] text-slate-600">{customInstructions.length}/2000</span>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">Email
            <input readOnly value={userData?.email || ""} className="cursor-not-allowed rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-slate-500 outline-none" />
            <span className="text-[11px] text-slate-600">Your email comes from your Google account and can’t be changed here.</span>
          </label>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Plan</p>
            <p className="mt-1 text-sm font-medium capitalize text-white">{userData?.plan || "free"}</p>
            <p className="mt-1 text-xs text-slate-500">{userData?.credits ?? 0} credits remaining</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {saved && <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-300"><Check size={15} /> Profile saved.</p>}
          <div className="mt-auto flex justify-end gap-2 border-t border-white/[0.07] pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Close</button>
            <button disabled={saving || !name.trim()} type="submit" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <LoaderCircle size={15} className="animate-spin" /> : null}{saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ProfileDrawer
