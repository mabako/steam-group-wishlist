#!/bin/env node

require('log-timestamp')
console.log('SWL -> https://github.com/mabako/steam-group-wishlist');

var express = require('express.io')
  , app = express()
  , cheerio = require('cheerio')
  , auth = require('./auth.js')
  , base = require('./base.js')
  , update = require('./update.js')
  , fetchBase = base.fetch;
app.http().io();

var appDB = {};

// Static files
app.use(express.static(__dirname + '/static'));
// moreso dynamic content
app.engine('jade', require('jade').__express);
app.set('views', __dirname + '/views');
// Cookies with secret. Not like it's the matter of actually keeping them secure, as it's open source.
// For what it's worth, there's no really private data here.
app.use(express.cookieParser('6-1e8-4D_Z-1!t91@_aS.@l-x-IM2#4_1$-_"4_01/)+-nM_d;'));

// node.js stuffs!
// Initial io connection
app.io.route('Hi-diddly-ho, neighborino', function(req) {
  console.log('Fetching info: ' + req.data.name + ', app:' + req.data.index);
  if(req.data.name.substr(0, 8) == 'friends/') {
    update.friends(req);
  } else {
    update.members(req, 1);
  }
});

// Searching for a game
app.get('/!/check', function(req, res) {
  var id = req.signedCookies.id;
  var selected = req.params.group || 'friends';
  if(id) {
    fetchGroups(id, res, function(profileName, groups) {
      res.render('sel.jade', {groups: groups, id: id, selected: selected, gr: req.params.group});
    });
  } else {
    res.render('sel.jade', {groups: [], id: null, selected: selected, gr: req.params.group});
  }
});

app.io.route('storesearch', function(req) {
  console.log('Looking up ' + req.data + ' in Store');
  fetchBase('http://store.steampowered.com/search/suggest?term=' + encodeURIComponent(req.data) + '&f=games&cc=US&l=english', function(err, res) {
    if(err || !res) {
      req.io.emit('storesearched', {input: req.data, result: []});
    } else {
      $ = cheerio.load(res);

      var results = [];
      $('a').each(function(i, elem) {
        var obj = $(this);

        var link = obj.attr('href').replace('http://store.steampowered.com/app/', '');
        link = link.substr(0, link.indexOf('/'));

        var text = obj.find('.match_name').text();
        if((''+parseInt(link)).length == link.length && text.indexOf('Free DLC') == -1 && text.indexOf('Prima Official Strategy Guide') == -1 && !(/\b(Demo)\b/ig).test(text)) {
          results[results.length] = {app: parseInt(link), name: text}
        }
      });
      req.io.emit('storesearched', {input: req.data, result: results});
    }
  });
})

// Ask for the wishlist of a single person.
app.io.route('?', update.wishlist);
app.io.route('games?', update.games);

// ask for the owned games of a single person
var matchOwnedGamesStart = 'var rgGames = ';
var matchOwnedGamesEnd = '];';
app.io.route('owned?', function(req) {
  fetchBase('http://steamcommunity.com/profiles/' + req.data + '/games?tab=all&l=english', function(err, res) {
    if(err || !res) {
      req.io.emit('owned!', {profile: req.data, games: null, name: '(?)'});
    } else {
      var $ = cheerio.load(res);
      if(res.indexOf('<div class="profile_private_info">') >= 0) {
        req.io.emit('owned!', {profile: req.data, games: null, name: $('title').text().replace('Steam Community :: ','')});
      } else {
        // Well, this is awkward.
        var start = res.indexOf(matchOwnedGamesStart) + matchOwnedGamesStart.length;
        var end = res.indexOf(matchOwnedGamesEnd, start) + 1;
        try {
          var games = JSON.parse(res.substring(start, end));
          var owned = {};
          for(var i = 0; i < games.length; ++ i) {
            owned[games[i].appid] = true;
          }

          // regular steam profile
          var name = $('h1').text();
          if(!name)
            // trading card profile
            name = $('.profile_small_header_name').text().trim();

          req.io.emit('owned!', {profile: req.data, games: owned, name: name, star: stars.indexOf(req.data) >= 0});
        } catch(e) {
          console.log('Error when trying to work with:')
          console.log(res)
        }
      }
    }
  });
});

// Redirect all /group/* to /*
app.get('/group/:name', function(req, res) {
    res.redirect('/' + req.params.name);
});

// Login
app.get('/', auth.home);
app.get('/!', auth.openid);
app.get('/!/auth', auth.verify);
app.get('/!/logout', auth.logout);

// Donating... just static, really.
app.get('/!/donate', function(req, res) {
  res.render('donate.jade');
});

// Send the file to do all the client-side processing
var nameregex = '([\\d\\w\\-]+)';
app.get('/friends/:user' + nameregex + '/:app(\\d+)', function(req, res) {
  res.render('check.jade', {group: 'friends/' + req.params.user, app: req.params.app});
});

app.get('/friends/:user' + nameregex, function(req, res) {
  res.render('wishlist.jade', {group: 'friends/' + req.params.user});
});

app.get('/:group' + nameregex + '/:app(\\d+)', function(req, res) {
  res.render('check.jade', {group: req.params.group, app: req.params.app});
})

app.get('/:group' + nameregex, function(req, res) {
  res.render('wishlist.jade', {group: req.params.group});
});

var ip = process.env.OPENSHIFT_NODEJS_IP || process.env.IP || '127.0.0.1'
var port = process.env.OPENSHIFT_INTERNAL_PORT || process.env.PORT || 8080;
app.listen(port, ip);
console.log('Lets listen on ' + ip + ':' + port);

// Clear cached apps once in a bluemoon
setInterval(function() {
  appDB = {};
}, 1000 * 6 * 60 * 60)
