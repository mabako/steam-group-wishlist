var base = require('./base')
  , xml2js = require('xml2js').parseString
  , cheerio = require('cheerio')
  , apps = require('./apps.js')
  , stars = require('./data/stars.js');

module.exports = {
  members: function(req, page) {
    // numeric group id? they have different urls
    var name = req.data.name;
    var url = /^\d+$/.test(name) ? ('gid/' + name) : ('groups/' + name);
    base.fetch('http://steamcommunity.com/' + url + '/memberslistxml/?xml=1&p=' + page, function(err, content) {
      if(err) {
        console.log('Member fetching error for ' + url + '\n' + err);
        req.io.emit('err', err);
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
              base.title(req, res.groupDetails[0].groupName, req.data.index)
            }
            req.io.emit('m', res.members[0].steamID64);
            if(parseInt(res.currentPage) < parseInt(res.totalPages)) {
              this.members(req, page + 1);
            } else {
              req.io.emit('k');
            }
          }
        });
      }
    });
  },
  friends: function(req) {
    var id = req.data.name.substr(8);
    var url = /^\d+$/.test(id) ? ('profiles/' + id) : ('id/' + id);
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
        base.title(req, 'Friends of ' + res.steamID, req.data.index);
        req.io.emit('m', res.friends[0].friend);
        req.io.emit('k');
      })
    });
  },

  // Grab a wishlist for a single person.
  wishlist: function(req) {
    base.fetch('http://steamcommunity.com/profiles/' + req.data + '/wishlist?cc=us', function(err, res) {
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
      req.io.emit('u', {name: name, profile: req.data, games: games, star: stars.indexOf(req.data) >= 0});
    });
  },
  // Game info for the wishlist
  games: function(req) {
    requested = {};
    for(var i = 0; i < req.data.fetch.length; ++ i) {
      requested[req.data.fetch[i]] = apps.get(req.data.fetch[i]);
    }
    req.io.emit('games!', {games: requested, profile: req.data.profile});
  }
}
