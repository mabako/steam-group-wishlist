var app = require('express.io')()
  , xml2js = require('xml2js').parseString
  , request = require('request')
  , cheerio = require('cheerio');
app.http().io();

var appDB = {};

function fetchBase(url, func) {
  var content = '';
  request(url, function(err, res, body) {
    func(err, body);
  }).end();
}

function memberlistUpdate(req, page) {
  fetchBase('http://steamcommunity.com/groups/' + req.data + '/memberslistxml/?xml=1&p=' + page, function(err, content) {
    if(err)
      return;

    xml2js(content, function(err, res) {
      res = res.memberList;

      req.io.emit('m', res.members[0].steamID64);
      if(res.currentPage < res.totalPages) {
        memberlistUpdate(req, page + 1);
      } else {
        req.io.emit('k');
      }
    });
  });
}

// node.js stuffs!
// Initial connection
app.io.route('Hi-diddly-ho, neighborino', function(req) {
  memberlistUpdate(req, 1);
});

// Ask for the wishlist of a single person.
app.io.route('?', function(req) {
  console.log('Requesting ' + req.data);
  fetchBase('http://steamcommunity.com/profiles/' + req.data + '/wishlist?cc=us', function(err, res) {
    $ = cheerio.load(res);

    var name = $('h1').text();
    var games = [];
    $('.wishlistRow').each(function(i, elem) {
      // Reduce this to the App ID
      var appLink = $(this).find('.gameLogo').children('a').first();
      var appID = parseInt(appLink.attr('href').substr(30));
      games[i] = appID;

      // ensure an entry in our app db.
      // TODO this shud prolly be purged somewhere somehow.
      // TODO Deals?
      if(appDB[appID] == undefined) {
        var price = $(this).find('.price').text().trim()
        if(price == '') price = 'N/A';
        var appEntry = {name: $(this).find('h4').text(), price: price, image: appLink.find('img').attr('src')};
        appDB[appID] = appEntry;
      }
    });
    req.io.emit('u', {name: name, profile: req.data, games: games});
  });
})

app.io.route('games?', function(req) {
  console.log('Requesting games ' + req.data);
  requested = {};
  for(var i = 0; i < req.data.length; ++ i) {
    requested[req.data[i]] = appDB[req.data[i]];
  }
  req.io.emit('games!', requested);
});

// Redirect all /group/* to /*
app.get('/group/:name', function(req, res) {
  res.redirect('/' + req.params.name);
});

// Redirect the homepage to somewhere else
app.get('/', function(req, res) {
  res.redirect('/ToastyG');
});

// Static files
app.get('/sort.js', function(req, res) {
  res.sendfile(__dirname + '/sort.js');
})

app.get('/wishlist.js', function(req, res) {
  res.sendfile(__dirname + '/wishlist.js');
})

// Send the file to do all the client-side processing
app.get('/*', function(req, res) {
  res.sendfile(__dirname + '/client.html');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

// Clear cached apps once in a bluemoon
setInterval(function() {
  appDB = {};
}, 1000 * 6 * 60 * 60)