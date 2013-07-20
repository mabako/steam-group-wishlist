var base = require('./base.js');

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
          var str = $('.apphub_AppName').text();
          if(!str) {
            var str = $('title').text();
            str = str.substr(0, str.length - 8).trim();
          }
          func(null, str);
        }
      });
    }
  },
  update: function(appID, obj, appLink) {
    if(appDB[appID] == undefined) {
      var price = obj.find('.price').text().trim() || obj.find('.discount_original_price').text() || 'N/A';
      appDB[appID] = {name: obj.find('h4').text(), price: price, image: appLink.find('img').attr('src')};
    }
  }
}