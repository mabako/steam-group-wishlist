var base = require('./base.js')
  , cheerio = require('cheerio');

var appDB = {};

module.exports = {
  // Since game information is stored just shortly before it is used, we can
  // assume this to exist always.
  get: function(app) {
    return appDB[app];
  },

  getName: function(app, func) {
    if(appDB[app]) {
      func(null, appDB[app].name);
    } else {
      base.fetch('http://store.steampowered.com/app/' + app + '?l=english', function(err, res) {
        if(!err) {
          $ = cheerio.load(res);
          var str = $('.apphub_AppName').text() || $('span[itemprop=name]').text();
          if(!str) {
            var str = $('title').text();
            str = str.substr(0, str.length - 8).trim().replace(/^Save (\d+)% on /, '');
          }
          func(null, str);
        }
      });
    }
  },
  update: function(appID, obj, appLink) {
    if(appDB[appID] == undefined) {
      var price = obj.find('.price').text().trim() || obj.find('.discount_original_price').text() || 'N/A';

      var image = appLink.find('img').attr('src');
      if(image == 'http://media.steampowered.com/steamcommunity/public/images/avatars/33/338200c5d6c4d9bdcf6632642a2aeb591fb8a5c2.gif')
        image = 'http://cdn.steampowered.com/v/gfx/apps/' + appID + '/header.jpg';

      appDB[appID] = {name: obj.find('h4').text(), price: price, image: image};
    }
  },

  // Updates the title shown on the page.
  title: function (req, title, app) {
    if(app) {
      this.getName(app, function(err, name) {
        if(!err)
          req.io.emit('t', title + ' - ' + name);
        else
          req.io.emit('t', title);
      });
    } else {
      req.io.emit('t', title);
    }
  }
}

// Clear cached apps once in a bluemoon
setInterval(function() {
  appDB = {};
}, 1000 * 6 * 60 * 60)
