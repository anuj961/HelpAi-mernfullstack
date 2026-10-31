import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import router from "./routes/agent.route.js"
import { getUserFacingAgentError } from "./utils/getUserFacingAgentError.js"
dotenv.config()

const port =process.env.PORT

const app=express()

app.use(express.json())
app.use("/",router)

app.use((err, req, res, next) => {
  const status = Number.isInteger(err?.status) ? err.status : 500
  return res.status(status).json({ message: getUserFacingAgentError(err) })
})


app.get("/",(req,res)=>{
    res.json({message:"hello from agent"})
})

app.listen(port,()=>{
    console.log(`agent started at ${port}`)
    connectDb()
})
