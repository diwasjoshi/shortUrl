const keys = require("../keys.js");

const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  if (req.path === '/users/login' || req.path === '/users/register'){
    return next();
  }

  var token = req.cookies.auth_token;

  if (!token || token.indexOf(' ') >= 0){
    return res.status(401).send({'status': 401, 'message': 'Invalid Authorization Token'})
  }

  jwt.verify(token, keys.SECRET_KEY, function(err, decoded) {
    if(err){
      return res.status(401).send({'status': 401, 'message': err.message});
    }
    req.user = decoded.user;
    req.userLoggedIn = true;
    return next();
  });
}
