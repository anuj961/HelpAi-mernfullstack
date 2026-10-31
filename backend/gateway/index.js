import express from "express"
import dotenv from "dotenv"
import proxy from "express-http-proxy"
dotenv.config()
import cors from "cors"
import cookieParser from "cookie-parser"
import { getCurrentUser } from "./controllers/user.controller.js"
import protect from "./middleware/auth.middleware.js"
import { proxyWithHeader } from "./utils/proxyWithHeader.js"
import morgan from "morgan"
const port =process.env.PORT

const app=express()
app.use(cors({
    origin:process.env.FRONTEND_URL,
    credentials:true
}))
app.use(morgan("dev"))
app.use(cookieParser())
app.use("/api/auth", (req, res, next) => {
    const allowedRoute =
        (req.method === "POST" && req.path === "/login") ||
        (req.method === "GET" && req.path === "/logout")
    if (!allowedRoute) return res.status(404).json({ message: "Not found" })
    next()
}, proxy(process.env.AUTH_SERVICE))
app.get("/api/shared/:token",proxy(process.env.CHAT_SERVICE,{proxyReqPathResolver:req=>`/shared/${req.params.token}`}))
app.patch("/api/profile",protect,proxyWithHeader(process.env.AUTH_SERVICE,() => "/profile"))
app.use("/api/chat",protect,proxyWithHeader(process.env.CHAT_SERVICE))
app.use("/api/agent",protect,proxyWithHeader(process.env.AGENT_SERVICE))
app.use("/api/billing",protect,proxyWithHeader(process.env.BILLING_SERVICE))
app.get("/api/me",protect,getCurrentUser)
app.get("/",(req,res)=>{
    res.json({message:"hello from gateway v5"})
})

app.listen(port,()=>{
    console.log(`gateway started at ${port}`)
})
