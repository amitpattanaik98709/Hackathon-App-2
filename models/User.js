const mongoose = require("mongoose");
const userschema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  prime_member:{
    type:Boolean,
    default:false
  },
  participated_hackathon:{
    type:[String],
  },
  created_hackathon:{
    type:[String],
  },
  subscribedate:{
    type:Date,
  },
  subscription_expiry_date:{
    type:Date,
  }
});

module.exports=mongoose.model("user",userschema);
