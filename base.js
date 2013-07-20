var request = require('request')
  , cheerio = require('cheerio')
  , apps = require('./apps.js');

module.exports = {
  // Loads arbitrary websites.
  fetch: function(url, func) {
    request({url:url, timeout: 3000}, function(err, res, body) {
      func(err, body);
    }).end();
  },

  // Fetches all groups of a user along with his name
  groups: function(id, res, func) {
    console.log('Fetching groups for profile ' + id);
    this.fetch('http://steamcommunity.com/profiles/' + id + '/groups', function(err, content) {
      if(err) {
        console.log('Groups for ' + id + ' -> ' + err);
        func(err, 'Error while querying Steam', [])
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
        func(null, name, groups);
      }
    });
  },

  // Updates the title shown on the page.
  title: function (req, title, app) {
    if(app) {
      apps.getName(app, function(err, name) {
        if(!err)
          req.io.emit('t', title + ' - ' + name);
        else
          req.io.emit('t', title);
      });
    } else {
      req.io.emit('t', title);
    }
  }
};
