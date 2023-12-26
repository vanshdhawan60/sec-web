require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;


const saltRounds = 10;

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));


app.use(session({
    secret: "HEyThisisSecretKey",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema( {
    username: {type: String, unique: false},
    secret: String,
    password: String,
    googleId: String,
});

//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password']});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate ({ googleId: profile.id }, function (err, user) {
        console.log(profile);
        return cb(err, user);
    });
  }
));

app.get ("/", function(req,res) {
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
  });

app.get ("/register", function(req,res) {
    res.render("register");
});

app.get ("/login", function(req,res,next) {
    res.render("login");
});

app.get("/secrets", function(req, res) {
    User.find({"secret" : {$ne: null}})
    .then (
        (foundUsers) => {
            res.render("secrets", {usersWithSecrets: foundUsers});
        }
    )
    .catch (
        (err) => {
            console.log(err);
            res.redirect("/");
        }
    )
})

app.get("/logout", function(req, res){
    req.logout(function (err) {
        if (err) {
            console.log(err);
            res.redirect("/");
        }
        else res.redirect("/");
    })
})

app.get("/submit", function(req, res){
    if (req.isAuthenticated()) res.render("submit");
    else res.redirect("/login");
})

app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
    User.findById(req.user.id)
    .then (
        (foundUser) => {
            foundUser.secret = submittedSecret;
                foundUser.save()
                .then (
                    () => {res.redirect("secrets");}
                );
        }
    )
    .catch (
        (err) => {
            console.log(err);
            res.redirect("/");
        }
    )
})


app.post("/register", function(req, res){

    User.register({username: req.body.username}, req.body.password, function(err, newUser){
        if (err) {
            console.log(err);
            res.redirect("/");
        }
        else {
            passport.authenticate("local") (req, res, function() {
                res.redirect("/secrets");
            })
        }
    });

});

app.post("/login", function(req, res) {

    const loginUser = new User ({
        username: req.body.username,
        password: req.body.password,
    });

    req.login(loginUser, function(err) {
        if (err) {
            console.log(err);
            res.redirect("/");
        }
        else {
            passport.authenticate("local") (req, res, function() {
                res.redirect("/secrets");
            })
        }
    });

});




app.listen(3000, function(){
    console.log('Server started at Port 3000.');
});