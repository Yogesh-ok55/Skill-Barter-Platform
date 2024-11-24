const express = require("express")
const app=express()
const nodemailer = require("nodemailer");
const session = require("express-session");
require('dotenv').config();

const loginModel = require("./models/login")
const messageModel = require("./models/message")

const cookieparser = require("cookie-parser");
const path = require('path');

app.use(cookieparser());
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,'public')))

const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken");


app.set('views', path.join(__dirname, 'views')); 
app.set('view engine', 'ejs');

const otpStorage = {};

app.use(session({
    secret: 'yourSecretKey', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',  // SMTP server for Gmail
    port: 587,  // Use 587 for TLS (StartTLS)
    secure: false,
    auth: {
        user: process.env.Gmail, 
        pass: process.env.password 
}});



app.get("/",(req,res)=>{
    
    res.render('login')
})


app.post("/register",async (req,res)=>{
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
   
    
    ;
  
    
})

app.get("/Register",(req,res)=>{
    res.render("index")
})

app.get("/footer",isLoggedIn,async (req,res)=>{
    let users=await loginModel.find({username:{$ne:req.user.username}})
    console.log(users)
    res.render("footer",{result:users})
})

app.post("/footer", isLoggedIn, async (req, res) => {
    let { search } = req.body;
    let currentUsername = req.user.username;  

   
    let result = await loginModel.find({
        skill: { $regex: search, $options: "i" },
        username: { $ne: currentUsername }  
    });

    res.render("footer", { result: result });
});

  

app.get("/message",isLoggedIn,(req,res)=>{
    res.render("message")
})

app.get("/PersonalMessages",isLoggedIn,async (req,res)=>{
    let user=req.user.username
    let data=await messageModel.find({from:user})
   
    res.render('PersonalMessages',{data:data})
})



app.post('/login',async(req,res)=>{
    let {username,password}=req.body;

    username=username.toLowerCase();
    

    let user=await loginModel.findOne({username})
    if(!user){
        return res.status(500).render("LoginErroe");
        
    }


    bcrypt.compare(password,user.password,(err,result)=>{
        if(result){
            
            let token=jwt.sign({username:username,userid:user._id},'secret-key');
            res.cookie('token',token)
            res.status(200).redirect(`/loginOTP?email=${user.email}&name=${user.name}`);
            
        }
        else{
            res.render('LoginError')
        }
    })
})

app.get("/loginOTP",(req,res)=>{
    let email = req.query.email;
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
            return res.status(500).send('Error sending OTP');
        } else {
            console.log('OTP sent: ' + info.response);
           
            res.render("loginOTP",{email:req.query.email,name:req.query.name});
        }
    });
   
    
})



app.get("/aboutus",(req,res)=>{
    res.render('aboutus')
})

app.get('/logout',isLoggedIn,(req,res)=>{
    res.cookie('token', '')
    res.redirect('/')
})

app.get("/reply",isLoggedIn,(req,res)=>{
    res.render("MessageBox")
})

app.get("/text/:username", isLoggedIn, async (req, res) => {
    let userMessages = await messageModel.findOne({ from: req.user.username, to: req.params.username });
    let user = (userMessages ? userMessages.content : []);
    
    res.render("text", { username: req.params.username, usermessage: user });
});


app.post("/text/:username", isLoggedIn, async (req, res) => {
    let from = req.user.username;
    let to = req.params.username;
    
    let messagesobject = `${from}: ${req.body.text}`;
    

    
    let m1 = await messageModel.findOneAndUpdate(
        { from, to },  // Filter condition
        {
            $push: { content: messagesobject },  
            $set: { lastUpdated: Date.now() }  
        },
        { new: true, upsert: true }  
    );

   
    let m2 = await messageModel.findOneAndUpdate(
        { from: to, to: from },
        { $push: { content: messagesobject }, $set: { timestamp: Date.now() } },
        { new: true, upsert: true }
    );

    
    res.redirect(`/text/${to}`);
});


//protected route
app.get('/home',isLoggedIn,async (req,res)=>{
  
    let user = await loginModel.findOne({username:req.user.username})
    res.render('HomePage',{name:user.name})
})

app.get('/delete/:username',isLoggedIn,async (req,res)=>{
    const result = await messageModel.deleteOne({ from:req.user.username,to:req.params.username });
    res.redirect('/PersonalMessages')
})

app.get('/dashboard',isLoggedIn,async (req,res)=>{
    console.log(req.user.username)
    let result= await loginModel.findOne({username:req.user.username})
    console.log(result)
    res.render('dashboard',{result:result})
})

app.get("/userdelete",isLoggedIn, async (req,res)=>{
    await loginModel.deleteOne({username:req.user.username})
    await messageModel.deleteOne({from:req.user.username})
    res.cookie('token',' ');
    res.redirect('/')
 })


 app.get("/updateuser",isLoggedIn, async (req,res)=>{
    console.log(req.user.username)
    let result = await loginModel.findOne({username:req.user.username})
    res.render('update',{result:result})
 })

 app.post("/updateuser",isLoggedIn, async (req,res)=>{
    let {name,skill,email,github,linkedin}=req.body;
    console.log(req.user.username)
    let m1 = await loginModel.findOneAndUpdate(
        { username: req.user.username }, 
        {
            $set: { 
                name: name, 
                skill: skill, 
                email: email, 
                github: github, 
                linkedin: linkedin 
            } 
           
        } // Filter condition
       
        
    );
    console.log(m1)
   

    res.redirect("/dashboard");
      
 })

 app.get("/otpVerification",(req,res)=>{

    
    const email = req.query.email; 

    
    const registrationData = req.session.registrationData;

    
    if (!registrationData) {
        return res.status(400).send("Registration data missing.");
    }

    
    res.render('otpVerification', {
        email: email,
    });
 })

 app.post("/loginVerify",(req,res)=>{
    const { email, otp } = req.body;
    const storedOtp = otpStorage[email];
        
        if (!storedOtp || storedOtp !== otp) {
            return res.status(400).send("Invalid OTP.");
        }

        delete otpStorage[email];

        console.log(req.query.name)

        res.render('HomePage',{name:req.query.name});


 })

 
 app.post("/otpVerification", async (req,res)=>{
    
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
 })

 
 

function isLoggedIn(req,res,next){

    
        if (!req.cookies.token) {  
            return res.status(401).send("Not authorized");
        }
    
        try {
            let data = jwt.verify(req.cookies.token, 'secret-key');
            req.user = data;
            console.log(req.user)  
            next();
        } catch (error) {
            return res.status(401).send("Invalid or expired token");
        }
    
    
}

app.use((req, res) => {
    res.status(404).render('Error');
});


app.listen(3000,()=>{
    console.log("ok");
})
