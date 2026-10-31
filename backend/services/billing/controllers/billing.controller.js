import axios from "axios"
import { PLANS } from "../config/Plans.js"
import razorpay from "../config/razorpay.js"
import Payment from "../models/payment.model.js"
import crypto from "crypto"

export const createOrder = async (req, res) => {
    try {
        const { plan } = req.body
        const userId = req.headers["x-user-id"]
        if (!userId) return res.status(401).json({ message: "Unauthorized" })

        const selectedPlan = PLANS[plan]
        if (!selectedPlan || selectedPlan.id === "free") {
            return res.status(404).json({ message: "Plan not found" })
        }

        const order = await razorpay.orders.create({
            amount: selectedPlan.amount * 100,
            currency: "INR",
            receipt: "receipt-" + crypto.randomBytes(8).toString("hex")
        })

        await Payment.create({
            userId,
            orderId: order.id,
            amount: selectedPlan.amount,
            credits: selectedPlan.credits,
            plan: selectedPlan.id,
            currency: order.currency,
            status: "created"
        })

        return res.status(200).json({ order, plan: selectedPlan })
    } catch {
        return res.status(500).json({ message: "Could not create the payment order" })
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
        if (!userId) return res.status(401).json({ message: "Unauthorized" })
        if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(value => typeof value === "string" && value.length > 0)) {
            return res.status(400).json({ message: "Payment details are incomplete" })
        }

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest()
        const suppliedSignature = Buffer.from(razorpay_signature, "hex")
        if (suppliedSignature.length !== expectedSignature.length ||
            !crypto.timingSafeEqual(expectedSignature, suppliedSignature)) {
            return res.status(400).json({ message: "Payment verification failed" })
        }

        const payment = await Payment.findOne({ orderId: razorpay_order_id })
        if (!payment) return res.status(404).json({ message: "Payment not found" })
        if (String(payment.userId) !== String(userId)) {
            return res.status(403).json({ message: "This payment belongs to another account" })
        }
        if (payment.status === "paid") {
            return res.status(200).json({ message: "Payment verified", alreadyApplied: true })
        }

        await axios.post(process.env.AUTH_SERVICE + "/update-plan", {
            userId: payment.userId,
            plan: payment.plan,
            credits: payment.credits,
            paymentId: payment.orderId
        })
        await Payment.updateOne(
            { orderId: razorpay_order_id, userId, status: { $ne: "paid" } },
            { $set: { status: "paid", paymentId: razorpay_payment_id } }
        )

        return res.status(200).json({ message: "Payment verified" })
    } catch {
        return res.status(500).json({ message: "Could not verify the payment right now. Please try again." })
    }
}
