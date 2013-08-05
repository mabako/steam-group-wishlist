var base = require('./base')
  , xml2js = require('xml2js').parseString
  , cheerio = require('cheerio')
  , apps = require('./apps.js')
  , stars = require('./data/stars.js');

module.exports = {
  members: function(req, page) {
    (function rec(req, page){
      // numeric group id? they have different urls
      var name = req.data.name;
      var url = /^\d{18}$/.test(name) ? ('gid/' + name) : ('groups/' + name);
      base.fetch('http://steamcommunity.com/' + url + '/memberslistxml/?xml=1&p=' + page, function(err, content) {
        if(err) {
          console.log('Member fetching error for ' + url + '\n' + err);
          req.io.emit('err', err.toString());
        } else {
          xml2js(content, function(err, res) {
            if(err || !res) {
              console.log('Member xml2js error for ' + url + '\n' + err);
              // Steam error page maybe.
              $ = cheerio.load(content);
              var message = $('h3').text();
              console.log('> ' + message);
              req.io.emit('err', message);
              return;
            } else {
              res = res.memberList;

              if(res.currentPage == 1) {
                apps.title(req, res.groupDetails[0].groupName, req.data.index)
              }
              req.io.emit('m', res.members[0].steamID64);
              if(parseInt(res.currentPage) < parseInt(res.totalPages)) {
                rec(req, page + 1);
              } else {
                req.io.emit('k');
              }
            }
          });
        }
      });
    })(req, page);
  },

  friends: function(req) {
    var id = req.data.name.substr(8);
    var url = /^\d{17}$/.test(id) ? ('profiles/' + id) : ('id/' + id);
    base.fetch('http://steamcommunity.com/' + url + '/friends/?xml=1', function(err, content) {
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
        apps.title(req, 'Friends of ' + res.steamID, req.data.index);
        req.io.emit('m', res.friends[0].friend);
        req.io.emit('k');
      })
    });
  },

  list: function(req) {
    var ids = req.data.name.substr(7).split(',');
    apps.title(req, 'VS', req.data.index);
    req.io.emit('m', ids);
    req.io.emit('k');
  },

  // Grab a wishlist for a single person.
  wishlist: function(req) {
    var url = /^\d{17}$/.test(req.data) ? ('profiles/' + req.data) : ('id/' + req.data);
    base.fetch('http://steamcommunity.com/' + url + '/wishlist?cc=us', function(err, res) {
      var ignore;
      if(err) {
        console.log('Error when fetching ' + url + ': ' + err);
        req.io.emit('err', 'Error when fetching ' + url + ': ' + err);
        ignore = true;
      }
      $ = cheerio.load(res);

      // trading card profile
      var name = $('.profile_small_header_name').text().trim();

      var games = [];
      $('.wishlistRow').each(function(i, elem) {
        // Reduce this to the App ID
        var obj = $(this);
        var appLink = obj.find('.gameLogo').children('a').first();
        var appID = parseInt(appLink.attr('href').substr(30));
        games[i] = appID;

        // ensure an entry in our app db.
        apps.update(appID, obj, appLink);
      });
      req.io.emit('u', {name: name, profile: req.data, games: games, star: stars.indexOf(req.data) >= 0, ignore: ignore});
    });
  },
  // Game info for the wishlist
  games: function(req) {
    requested = {};
    for(var i = 0; i < req.data.fetch.length; ++ i) {
      requested[req.data.fetch[i]] = apps.get(req.data.fetch[i]);
    }
    req.io.emit('games!', {games: requested, profile: req.data.profile});
  },

  // Check if this game is owned by this person in particular.
  owned: function(req) {
    var matchOwnedGamesStart = 'var rgGames = ';
    var matchOwnedGamesEnd = '];';
    var url = /^\d{17}$/.test(req.data) ? ('profiles/' + req.data) : ('id/' + req.data);
    base.fetch('http://steamcommunity.com/' + url + '/games?tab=all&l=english', function(err, res) {
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
            console.log('Error when trying to work with:');
            console.log(res);
            console.log('Error: ' + e)
          }
        }
      }
    });
  }
}
