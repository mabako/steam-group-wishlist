#!/bin/env node
require('log-timestamp')
console.log('SWL -> https://github.com/mabako/steam-group-wishlist');

var express = require('express.io')
  , app = express()
  , xml2js = require('xml2js').parseString
  , request = require('request')
  , cheerio = require('cheerio')
  , openid = require('openid')
  , relyingParty = new openid.RelyingParty('http://swl.mabako.net/!/auth', 'http://swl.mabako.net/', true, false, []);
app.http().io();

var appDB = {};

function fetchBase(url, func) {
  request(url, function(err, res, body) {
    func(err, body);
  }).end();
}

function memberlistUpdate(req, page) {
  // numeric group id? they have different urls
  var url = ('' + parseInt(req.data, 10)).length == req.data.length ? ('gid/' + req.data) : ('groups/' + req.data);
  fetchBase('http://steamcommunity.com/' + url + '/memberslistxml/?xml=1&p=' + page, function(err, content) {
    if(err) {
      console.log(err);
      return;
    }

    xml2js(content, function(err, res) {
      if(err || !res) {
        console.log(err);
        return;
      }
      res = res.memberList;

      if(res.currentPage == 1)
        req.io.emit('t', res.groupDetails[0].groupName);
      req.io.emit('m', res.members[0].steamID64);
      if(res.currentPage < res.totalPages) {
        memberlistUpdate(req, page + 1);
      } else {
        req.io.emit('k');
      }
    });
  });
}

function friendsUpdate(req) {
  fetchBase('http://steamcommunity.com/profiles/' + req.data.substr(8) + '/friends/?xml=1', function(err, content) {
    if(err) {
      console.log(err);
      return;
    }
    
    xml2js(content, function(err, res) {
      if(err || !res) {
        console.log(err);
        return;
      }

      res = res.friendsList;
      req.io.emit('t', 'Friends of ' + res.steamID);
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
// Initial connection
app.io.route('Hi-diddly-ho, neighborino', function(req) {
  console.log('Fetching group info for ' + req.data);
  if(req.data.substr(0, 8) == 'friends/') {
    friendsUpdate(req);
  } else {
    memberlistUpdate(req, 1);
  }
});

// Ask for the wishlist of a single person.
app.io.route('?', function(req) {
  fetchBase('http://steamcommunity.com/profiles/' + req.data + '/wishlist?cc=us', function(err, res) {
    $ = cheerio.load(res);

    var name = $('h1').text();
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
    req.io.emit('u', {name: name, profile: req.data, games: games});
  });
})

app.io.route('games?', function(req) {
  requested = {};
  for(var i = 0; i < req.data.fetch.length; ++ i) {
    requested[req.data.fetch[i]] = appDB[req.data.fetch[i]];
  }
  req.io.emit('games!', {games: requested, profile: req.data.profile});
});

// Redirect all /group/* to /*
app.get('/group/:name', function(req, res) {
    res.redirect('/' + req.params.name);
});

// Login
app.get('/', function(req, res) {
  var id = req.signedCookies.id;
  if(id) {
    fetchBase('http://steamcommunity.com/profiles/' + id + '/groups', function(err, content) {
      if(err) {
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
        res.render('profile.jade', {name: name, groups: groups, id: id});
      }
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


// Send the file to do all the client-side processing
app.get('/friends/:user', function(req, res) {
  res.render('wishlist.jade', {group: 'friends/' + req.params.user});
});

app.get('/:group/:app', function(req, res) {
  res.render('check.jade', {group: req.params.group, app: req.params.app});
})

app.get('/:group', function(req, res) {
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
