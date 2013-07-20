var base = require('./base.js')
  , openid = require('openid');

// Since these have to be domain-independent, we rather store a dynamic (small) amount of things here.
var _relyingParties = {};
function relyingParty(req) {
  var host = req.headers.host;
  if(!_relyingParties[host])
    _relyingParties[host] = new openid.RelyingParty('http://' + host + '/!/auth', 'http://' + host, true, false, []) 
  return _relyingParties[host];
}

module.exports = {
  home: function(req, res) {
    var id = req.signedCookies.steamID;
    if(id) {
      base.groups(id, res, function(err, profileName, groups) {
        res.render('profile.jade', {name: profileName, groups: groups, id: id, err: typeof err != 'undefined'});
      });
    } else {
      res.render('login.jade');
    }
  },
  openid: function(req, res) {
    relyingParty(req).authenticate('http://steamcommunity.com/openid', false, function(err, u) {
      if(err) {
        res.writeHead(200);
        res.end('Failed: ' + err.message);
      } else if(!u) {
        res.writeHead(200);
        res.end('Failed.');
      } else {
        res.redirect(u);
      }
    });
  },
  verify: function(req, res) {
    relyingParty(req).verifyAssertion(req, function(error, result) {
      if(!error && result.authenticated) {
        res.cookie('steamID', result.claimedIdentifier.replace('http://steamcommunity.com/openid/id/', ''), { signed: true });
        res.redirect('/');
      } else {
        res.end('Failed: ' + error.message);
      }
    });
  },
  logout: function(req, res) {
    res.cookie('steamID', '');
    res.redirect('/');
  },
  groupcheck: function(req, res) {
    var id = req.signedCookies.steamID;
    var selected = req.params.group || 'friends';
    if(id) {
      base.groups(id, res, function(err, profileName, groups) {
        if(!err)
          res.render('sel.jade', {groups: groups, id: id, selected: selected, gr: req.params.group});
        else
        res.render('sel.jade', {groups: [], id: null, selected: selected, gr: req.params.group});
      });
    } else {
      res.render('sel.jade', {groups: [], id: null, selected: selected, gr: req.params.group});
    }
  }
};
