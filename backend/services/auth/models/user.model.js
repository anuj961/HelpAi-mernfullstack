import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    firebaseUid:{
        type:String,
        unique:true
    },
    name:String,
    email:String,
    avatar:String,
    customInstructions:{type:String,default:"",maxlength:2000},
    plan:{
        type:String,
        default:"free"
    },
    credits:{
        type:Number,
        default:100
    },
    totalCredits:{
        type:Number,
        default:100
    },
    planExpiresAt:Date,
    appliedPaymentIds:{type:[String],default:[],select:false}

},{
    timestamps:true
})

const User=mongoose.model("User",userSchema)
export default User