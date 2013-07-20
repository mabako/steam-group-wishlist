var base = require('./base.js');

var appDB = {};

module.exports = {
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
  }
}