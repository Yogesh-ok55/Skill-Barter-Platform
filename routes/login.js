const express = require('express');
const router = express.Router();
const loginModel = require("../models/login")

const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken");


router.post('/', async (req, res) => {
    let {username,password}=req.body;

    username=username.toLowerCase();
    

    let user=await loginModel.findOne({username})
    if(!user){
        return res.status(500).render("LoginError");
        
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
});

module.exports = router