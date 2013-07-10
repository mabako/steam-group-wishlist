#!/bin/env node

var baseURL = 'http://swl.mabako.net';

require('log-timestamp')
console.log('SWL -> https://github.com/mabako/steam-group-wishlist');

var express = require('express.io')
  , app = express()
  , xml2js = require('xml2js').parseString
  , request = require('request')
  , cheerio = require('cheerio')
  , openid = require('openid')
  , relyingParty = new openid.RelyingParty(baseURL + '/!/auth', baseURL, true, false, [])
  , stars = require('./data/stars.js');
app.http().io();

console.dir(stars)

var appDB = {};

function fetchBase(url, func) {
  request(url, function(err, res, body) {
    func(err, body);
  }).end();
}

function sendTitle(req, title, app) {
  if(app) {
    if(appDB[app]) {
      title += ' - ' + appDB[req.data.index].name;
      req.io.emit('t', title);
    } else {
      fetchBase('http://store.steampowered.com/app/' + app + '?l=english', function(err, res) {
        if(!err) {
          $ = cheerio.load(res);
          var str = $('.apphub_AppName').text();
          if(!str) {
            var str = $('title').text();
            str = str.substr(0, str.length - 8).trim();
          }
          title += ' - ' + str;
          req.io.emit('t', title);
        }
      })
    }
  } else {
    req.io.emit('t', title);
  }
}

function memberlistUpdate(req, page) {
  // numeric group id? they have different urls
  var name = req.data.name;
  var url = /^\d+$/.test(name) ? ('gid/' + name) : ('groups/' + name);
  fetchBase('http://steamcommunity.com/' + url + '/memberslistxml/?xml=1&p=' + page, function(err, content) {
    if(err) {
      console.log('Member fetching error for ' + url + '\n' + err);
      return;
    }

    xml2js(content, function(err, res) {
      if(err || !res) {
        console.log('Member xml2js error for ' + url + '\n' + err);
        // Steam error page maybe.
        $ = cheerio.load(content);
        var message = $('h3').text();
        console.log('> ' + message);
        req.io.emit('err', message);
        return;
      }
      res = res.memberList;

      if(res.currentPage == 1) {
        sendTitle(req, res.groupDetails[0].groupName, req.data.index)
      }
      req.io.emit('m', res.members[0].steamID64);
      if(parseInt(res.currentPage) < parseInt(res.totalPages)) {
        memberlistUpdate(req, page + 1);
      } else {
        req.io.emit('k');
      }
    });
  });
}

function friendsUpdate(req) {
  var id = req.data.name.substr(8);
  var url = /^\d+$/.test(id) ? ('profiles/' + id) : ('id/' + id);
  fetchBase('http://steamcommunity.com/' + url + '/friends/?xml=1', function(err, content) {
    if(err) {
      console.log('Friends fetching error for ' + url + '\n' + err);
      return;
    }
    
    xml2js(content, function(err, res) {
      if(err || !res || !res.friendsList) {
        console.log('Friends xml2js error for ' + url + '\n' + err);
        return;
      }

      res = res.friendsList;
      sendTitle(req, 'Friends of ' + res.steamID, req.data.index);
      req.io.emit('m', res.friends[0].friend);
      req.io.emit('k');
    })
  });
}

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
    friendsUpdate(req);
  } else {
    memberlistUpdate(req, 1);
  }
});

// Fetches all groups of a user along with his name
function fetchGroups(id, res, func) {
  console.log('Fetching groups for profile ' + id);
  fetchBase('http://steamcommunity.com/profiles/' + id + '/groups', function(err, content) {
    if(err) {
      console.log(err);
      res.writeHead(500);
      res.end();
    } else {
      $ = cheerio.load(content);

      var name = $('h1').text();
      var groups = [];
      $('a.linkTitle').each(function(i, elem) {
        var obj = $(this);
        var link = obj.attr('href');
        link = link.substr(link.lastIndexOf('/') + 1);
        groups[groups.length] = {url: link, name: obj.text()};
      });
      func(name, groups);
    }
  });
}

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
app.io.route('?', function(req) {
  fetchBase('http://steamcommunity.com/profiles/' + req.data + '/wishlist?cc=us', function(err, res) {
    $ = cheerio.load(res);

    // regular steam profile
    var name = $('h1').text();
    if(!name)
      // trading card profile
      name = $('.profile_small_header_name').text().trim();

    var games = [];
    $('.wishlistRow').each(function(i, elem) {
      // Reduce this to the App ID
      var obj = $(this);
      var appLink = obj.find('.gameLogo').children('a').first();
      var appID = parseInt(appLink.attr('href').substr(30));
      games[i] = appID;

      // ensure an entry in our app db.
      // TODO this shud prolly be purged somewhere somehow.
      // TODO Deals?
      if(appDB[appID] == undefined) {
        var price = obj.find('.price').text().trim();
        if(price == '') price = obj.find('.discount_original_price').text();
        if(price == '') price = 'N/A';
        var appEntry = {name: obj.find('h4').text(), price: price, image: appLink.find('img').attr('src')};
        appDB[appID] = appEntry;
      }
    });
    req.io.emit('u', {name: name, profile: req.data, games: games, star: stars.indexOf(req.data) >= 0});
  });
})

app.io.route('games?', function(req) {
  requested = {};
  for(var i = 0; i < req.data.fetch.length; ++ i) {
    requested[req.data.fetch[i]] = appDB[req.data.fetch[i]];
  }
  req.io.emit('games!', {games: requested, profile: req.data.profile});
});

// ask for the owned games of a single person
var matchOwnedGamesStart = 'var rgGames = ';
var matchOwnedGamesEnd = '];';
app.io.route('owned?', function(req) {
  fetchBase('http://steamcommunity.com/profiles/' + req.data + '/games?tab=all&l=english', function(err, res) {
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
  });
});

// Redirect all /group/* to /*
app.get('/group/:name', function(req, res) {
    res.redirect('/' + req.params.name);
});

// Login
app.get('/', function(req, res) {
  var id = req.signedCookies.id;
  if(id) {
    fetchGroups(id, res, function(profileName, groups) {
      res.render('profile.jade', {name: profileName, groups: groups, id: id});
    });
  } else {
    res.render('login.jade');
  }
});

app.get('/!/auth', function(req, res) {
  relyingParty.verifyAssertion(req, function(error, result) {
    if(!error && result.authenticated) {
      res.cookie('id', result.claimedIdentifier.replace('http://steamcommunity.com/openid/id/', ''), { signed: true });
      res.redirect('/');
    } else {
      res.end('Failed: ' + error.message);
    }
  });
});

app.get('/!/logout', function(req, res) {
  res.cookie('id', '');
  res.redirect('/');
});

app.get('/!', function(req, res) {
  relyingParty.authenticate('http://steamcommunity.com/openid', false, function(err, u) {
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
});

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
