var request = require('request')
  , cheerio = require('cheerio');

module.exports = {
  // Loads arbitrary websites.
  fetch: function(url, func) {
    request({url:url, timeout: 6000}, function(err, res, body) {
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

        var name = $('h1').text(),
            groups = {};

        $('a.linkTitle').each(function(i, elem) {
          var obj = $(this),
              link = obj.attr('href');

          link = link.substr(link.lastIndexOf('/') + 1);
          groups[link] = {url: link, name: obj.text()};
        });

        func(null, name, groups);
      }
    });
  }
};
