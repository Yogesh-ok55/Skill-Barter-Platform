const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const otpStorage = require('../storage');
const transporter = require("../transporter");

require('dotenv').config();

// Set up storage for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads'); // specify the 'uploads' folder
    },
    filename: (req, file, cb) => {
        const username = req.body.username;
        const ext = path.extname(file.originalname); // retain the file extension
        cb(null, `${username}${ext}`); // Save file with username as the filename
    }
});

// Initialize multer with the storage configuration
const upload = multer({ storage: storage });

router.post('/', upload.single('image'), (req, res) => {
    const { name, username, skill, email, github, linkedin, password } = req.body;

    // Save registration data in session
    req.session.registrationData = { name, username, skill, email, github, linkedin, password };

    // OTP generation logic
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStorage[email] = otp;
    console.log(otp + " " + otpStorage[email]);

    // Send OTP email
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

module.exports = router;
