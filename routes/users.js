var router = require('express').Router();
var User = require('../models/user');
var keys = require('../keys.js');

var passport = require('passport');
var localStrategy = require('passport-local').Strategy;

var jwt    = require('jsonwebtoken');

/*router.get('/profile', function(req, res, next){
    if (!req.user){
        return res.redirect('login');
    }
    res.render('accounts/profile', {
        errors: req.flash('errors'),
    });
});*/


router.post('/register', function(req, res, next){
    console.log(req);
    const {email, password} = req.body;
    if(!email || !password){
      return res.status(400).send({"status": 400, "error": "params missing"});
    }
    var user = new User();

    user.email = email;
    user.password = password;

    User.findOne({ email: email }, function(err, existingUser){
        if(existingUser){
            return res.status(400).send({"status": 400, "error": "Email already present"});
        } else {
            user.createUser(function(err, user){
                if(err) return next(err);
                return res.status(200).send({"status": 200, "message": "user created"});
            });
        }
    });
});


router.post('/login', function(req, res) {
    const {email, password} = req.body;
    if(!email || !password){
      return res.status(400).send({"status": 400, "error": "params missing"});
    }

    User.findOne({ email: email }, async function(err, user){
        if(user && user.comparePassword(password)){
            var token = jwt.sign({user}, keys.SECRET_KEY, {
              expiresIn: '2d'
            });
            res.cookie('auth_token', token, { maxAge: 900000, httpOnly: true});
            return res.status(200).send({"status": 200, "error": "successfull login"});
        } else {
            return res.status(401).send({"status": 401, "error": "invalid credentials"});
        }
    });
});


router.get('/showuser', function(req, res){

  return res.status(200).send({"status": 200, "user": req.user});
});


router.get('/getallurls', function(req, res){

  User.find({email: req.user.email}).
  select("email urls -_id").
  populate('urls', ['originalUrl', 'shortCode']).exec(function(err, user){
    urls = user[0].urls;

    return res.status(200).send({
      "status": 200,
      "data": urls.reduce((acc, cur) => {
        var temp = {};
        temp.originalUrl = cur.originalUrl;
        temp.shortUrl = keys.SHORT_URLS_HOST + "/" + cur.shortCode;
        acc.push(temp);
        return acc;
      }, [])
    });
  });
});

router.get('/logout', function(req, res){
  res.clearCookie("auth_token");
  return res.status(200).send({"status": 200, "message": "successfull logout"});
})
module.exports = router;
