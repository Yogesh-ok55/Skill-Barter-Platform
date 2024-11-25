const express = require('express');
const router = express.Router();
const otpStorage = require('../storage');

require('dotenv').config();

const transporter = require("../transporter")



router.post('/', (req, res) => {
    const { name, username, skill, email, github, linkedin, password } = req.body;

    
    req.session.registrationData = { name, username, skill, email, github, linkedin, password };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

   
    otpStorage[email] = otp;
    console.log(otp+" "+otpStorage[email]);

    
    const mailOptions = {
        from: 'your-email@example.com',
        to: email,
        subject: 'Your OTP for 2-Factor Authentication',
        text: `Your OTP is ${otp}. It is valid for 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Error in sending OTP');
        } else {
            console.log('OTP sent: ' + info.response);
            // Redirect to OTP page with email passed in the URL
            res.redirect(`/otpVerification?email=${email}`);
        }
    });
   
    
});

module.exports = router