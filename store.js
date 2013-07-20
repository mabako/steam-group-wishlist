var base = require('./base.js')
  , cheerio = require('cheerio');

module.exports = {
  search: function(req) {
    console.log('Looking up ' + req.data + ' in Store');
    base.fetch('http://store.steampowered.com/search/suggest?term=' + encodeURIComponent(req.data) + '&f=games&cc=US&l=english', function(err, res) {
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
  }
}
