const express = require('express');
const router = express.Router();
const loginModel = require("../models/login")
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken");

const otpStorage = require('../storage');

router.post('/', async (req, res) => {
    const { email, otp } = req.body;
        
        
    const storedOtp = otpStorage[email];
    console.log(req.session.registrationData+" "+otp+" "+otpStorage[email])
    if (!storedOtp || storedOtp !== otp) {
        return res.status(400).send("Invalid OTP.");
    }

    delete otpStorage[email]

    
    const registrationData = req.session.registrationData;
    if (!registrationData) {
        return res.status(400).send("Registration data missing.");
    }

    
let { name, username, skill, password, github, linkedin } = registrationData;

   username=username.toLowerCase();

let user=await loginModel.findOne({username})
if(user){
    return res.status(500).send("User Alrady Registerd")
}



const saltRounds=10;
bcrypt.genSalt(saltRounds,(err,salt)=>{
    bcrypt.hash(password,salt,async (err,hash)=>{
        let user = await loginModel.create({
            name,
            username,
            skill,
            email,
            github,
            linkedin,
            password:hash
        })

        let token=jwt.sign({username:username,userid:user._id},'secret-key');
        res.cookie('token',token)
        res.render('HomePage',{name:name})
    })
    })
});

module.exports = router;
