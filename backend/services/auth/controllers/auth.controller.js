import { getAuth } from "firebase-admin/auth"
import { app } from "../config/firebase.js"
import User from "../models/user.model.js"
import redis from "../../../shared/redis/redis.js"

export const login = async (req, res) => {
    try {
        const { token } = req.body
        const decoded = await getAuth(app).verifyIdToken(token)
        let user = await User.findOne({
            firebaseUid: decoded.uid
        })

        if (!user) {
            user = await User.create({
                firebaseUid: decoded.uid,
                name: decoded.name,
                email: decoded.email,
                avatar: decoded.picture
            })
        }

        const sessionId = crypto.randomUUID()
        await redis.set(`user-session-${user?._id}`,
            sessionId
            , "EX", 7 * 24 * 60 * 60)
        await redis.set(`session-${sessionId}`, JSON.stringify({
            userId: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            customInstructions: user.customInstructions || "",
            plan: user.plan,
            credits: user.credits,
            totalCredits: user.totalCredits,
            planExpiresAt: user.planExpiresAt
        }), "EX", 7 * 24 * 60 * 60)




        res.cookie("session", sessionId, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            customInstructions: user.customInstructions || "",
            plan: user.plan,
            credits: user.credits,
            totalCredits: user.totalCredits,
            planExpiresAt: user.planExpiresAt
        })

    } catch (error) {
        return res.status(500).json({ message: `login error ${error}` })
    }
}


export const updateProfile = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const name = typeof req.body.name === "string" ? req.body.name.trim() : ""
        const avatar = typeof req.body.avatar === "string" ? req.body.avatar.trim() : ""
        const customInstructions = typeof req.body.customInstructions === "string" ? req.body.customInstructions.trim() : ""
        if (!userId) return res.status(401).json({ message: "Unauthorized" })
        if (!name || name.length > 80) return res.status(400).json({ message: "Name must be between 1 and 80 characters" })
        if (customInstructions.length > 2000) return res.status(400).json({ message: "Custom instructions must be under 2,000 characters" })
        if (avatar.length > 3000000) return res.status(400).json({ message: "Profile photo is too large" })
        if (avatar && !avatar.startsWith("data:image/")) {
            try {
                const url = new URL(avatar)
                if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid protocol")
            } catch {
                return res.status(400).json({ message: "Enter a valid photo URL or upload an image" })
            }
        }
        if (avatar.startsWith("data:image/") && !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(avatar)) return res.status(400).json({ message: "Upload a PNG, JPEG, WEBP, or GIF image" })

        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ message: "User not found" })
        user.name = name
        user.avatar = avatar
        user.customInstructions = customInstructions
        await user.save()

        const sessionId = await redis.get(`user-session-${user._id}`)
        if (sessionId) {
            await redis.set(`session-${sessionId}`, JSON.stringify({
                userId: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
            customInstructions: user.customInstructions || "",
                plan: user.plan,
                credits: user.credits,
                totalCredits: user.totalCredits,
                planExpiresAt: user.planExpiresAt
            }), "EX", 7 * 24 * 60 * 60)
        }

        return res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            customInstructions: user.customInstructions || "",
            plan: user.plan,
            credits: user.credits,
            totalCredits: user.totalCredits,
            planExpiresAt: user.planExpiresAt
        })
    } catch (error) {
        return res.status(500).json({ message: `update profile error ${error.message}` })
    }
}

export const logOut = async (req, res) => {
    try {
        const sessionId = req.cookies?.session
        await redis.del(`session-${sessionId}`)

        res.clearCookie("session")
        return res.status(200).json({ message: "logout successfully" })
    } catch (error) {
        return res.status(500).json({ message: `logout error ${error}` })
    }
}


export const updateUserPayment = async (req, res) => {
    try {
        const { plan, credits, userId, paymentId } = req.body
        const allowedPlanCredits = { starter: 500, pro: 1000 }
        if (!userId || !paymentId || paymentId.length > 100 ||
            allowedPlanCredits[plan] !== credits) {
            return res.status(400).json({ message: "Invalid payment grant" })
        }

        const user = await User.findOneAndUpdate(
            { _id: userId, appliedPaymentIds: { $ne: paymentId } },
            {
                $set: {
                    plan,
                    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                },
                $inc: { credits, totalCredits: credits },
                $addToSet: { appliedPaymentIds: paymentId }
            },
            { new: true }
        )

        if (!user) {
            const existingUser = await User.findById(userId).select("+appliedPaymentIds")
            if (!existingUser) return res.status(404).json({ message: "User not found" })
            if (!existingUser.appliedPaymentIds?.includes(paymentId)) {
                return res.status(409).json({ message: "Could not apply payment" })
            }
            return res.status(200).json({ success: true, alreadyApplied: true })
        }

        const sessionId = await redis.get("user-session-" + user._id)
        if (sessionId) {
            await redis.set("session-" + sessionId, JSON.stringify({
                userId: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                customInstructions: user.customInstructions || "",
                plan: user.plan,
                credits: user.credits,
                totalCredits: user.totalCredits,
                planExpiresAt: user.planExpiresAt
            }), "EX", 7 * 24 * 60 * 60)
        }
        return res.status(200).json({ success: true })
    } catch {
        return res.status(500).json({ message: "Could not update the payment" })
    }
}

export const deductCredits = async (req, res) => {
    try {
        const { userId, agent } = req.body
        const costs = { chat: 1, search: 5, coding: 10, pdf: 10, ppt: 10, vision: 10 }
        if (!userId || !Object.hasOwn(costs, agent)) {
            return res.status(400).json({ message: "Invalid credit request" })
        }

        const requiredCredits = costs[agent]
        const user = await User.findOneAndUpdate(
            { _id: userId, credits: { $gte: requiredCredits } },
            { $inc: { credits: -requiredCredits } },
            { new: true }
        )
        if (!user) {
            const exists = await User.exists({ _id: userId })
            return exists
                ? res.status(400).json({ message: "Not enough credits." })
                : res.status(404).json({ message: "User not found" })
        }

        const sessionId = await redis.get("user-session-" + user._id)
        if (sessionId) {
            await redis.set("session-" + sessionId, JSON.stringify({
                userId: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                customInstructions: user.customInstructions || "",
                plan: user.plan,
                credits: user.credits,
                totalCredits: user.totalCredits,
                planExpiresAt: user.planExpiresAt
            }), "EX", 7 * 24 * 60 * 60)
        }
        return res.status(200).json({ success: true, credits: user.credits })
    } catch {
        return res.status(500).json({ message: "Could not update credits" })
    }
}
