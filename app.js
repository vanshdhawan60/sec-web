require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
//const md5 = require('md5');
//const encrypt = require('mongoose-encryption');
const bcrypt = require('bcrypt');

const saltRounds = 10;

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema( {
    email: String,
    password: String
});

//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password']});

const User = mongoose.model('User', userSchema);

app.get ("/", function(req,res) {
    res.render("home");
});

app.get ("/register", function(req,res) {
    res.render("register");
});

app.get ("/login", function(req,res) {
    res.render("login");
});

app.post("/register", function(req, res){
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        // Store hash in your password DB.
        if (err) res.send(err);
        else {
            const newUser = new User ({
                email: req.body.username,
                //password: md5(req.body.password)
                password: hash
            });
    
            newUser.save();
            res.render("secrets");
        }
    });
});

app.post("/login", function(req, res) {
    const username = req.body.username;
    //const password = md5(req.body.password);
    const password = req.body.password;

    User.findOne({email: username})
    .then (
        function (user) {
            bcrypt.compare(password, user.password, function(err, result) {
                if (err) res.send(err);
                else if (result == true) res.render("secrets");
                else if (result === false) res.send("Invalid password. ");
            });
        }
    )
    .catch (
        (err) => {
            res.send(err);
        }
    )
});




app.listen(3000, function(){
    console.log('Server started at Port 3000.');
});