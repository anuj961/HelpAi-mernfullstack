import { useEffect } from 'react'
import Home from './pages/Home'
import SharedChatPage from './pages/SharedChatPage'
import getCurrentUser from './features/getCurrentUser'
import { useDispatch } from 'react-redux'
import { setUserdata } from './redux/userSlice'

function App() {
const shareToken = new URLSearchParams(window.location.search).get("share")
const dispatch=useDispatch()
useEffect(()=>{
  const getUser=async ()=>{
    const data=await getCurrentUser()
    dispatch(setUserdata(data))
  }
  getUser()
},[dispatch])

  if (shareToken) return <SharedChatPage token={shareToken} />

  return (
   <>
   <Home/>
   </>
  )
}

export default App
