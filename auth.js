var base = require('./base.js')
  , openid = require('openid')
  , cheerio = require('cheerio');

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
    if(req.params.group || req.params.user) {
      res.render('sel.jade', {groups: [], id: null, groupid: req.params.group || ('friends/' + req.params.user)});
    } else {
      var id = req.signedCookies.steamID;
      if(id) {
        base.groups(id, res, function(err, profileName, groups) {
          if(!err)
            res.render('sel.jade', {groups: groups, id: id, groupid: null});
          else
          res.render('sel.jade', {groups: [], id: null, groupid: null});
        });
      } else {
        res.render('sel.jade', {groups: [], id: null, groupid: null});
      }
    }
  },
  selectfriends: function(req, res) {
    var id = req.signedCookies.steamID;
    if(id) {
      base.fetch('http://steamcommunity.com/profiles/' + id + '/friends', function(err, body) {
        if(!err) {
          $ = cheerio.load(body);
          var friends = [];
          $('.friendBlock').each(function(i, elem) {
            var obj = $(this);
            friends[i] = { url: obj.find('a').attr('href').replace(/http:\/\/steamcommunity\.com\/(id|profiles)\//, ''), name: obj.find('.friendBlockContent').text().substr(6).split("\r")[0] }
          });
          friends.sort(function(a, b) { return a.name.toLowerCase() == b.name.toLowerCase() ? 0 : a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1 })
          res.render('selfriends.jade', {friends: friends});
        } else {
          res.redirect('/');
        }
      });
    } else {
      res.redirect('/');
    }
  }
};
