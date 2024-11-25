const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',  
    port: 587,  
    secure: false,
    type: "login",
    auth: {
        user: process.env.Gmail, 
        pass: process.env.password 
}});

module.exports=transporter;