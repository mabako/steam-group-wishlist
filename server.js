#!/bin/env node

require('log-timestamp')
console.log('SWL ' + require('./package.json').version + ' -> https://github.com/mabako/steam-group-wishlist');

var express = require('express.io')
  , app = express()
  , auth = require('./auth.js')
  , update = require('./update.js')
  , store = require('./store.js');
app.http().io();

// Static files
app.use(express.static(__dirname + '/static'));
// moreso dynamic content
app.engine('jade', require('jade').__express);
app.set('views', __dirname + '/views');
// Cookies with secret. Not like it's the matter of actually keeping them secure, as it's open source.
// For what it's worth, there's no really private data here.
app.use(express.cookieParser('6-1e8-4D_Z-1!t91@_aS.@l-x-IM2#4_1$-_"4_01/)+-nM_d;'));

// node.js stuffs!
// Initial io connection
app.io.route('Hi-diddly-ho, neighborino', function(req) {
  console.log('Fetching info: ' + req.data.name + ', app:' + req.data.index);
  if(req.data.name.substr(0, 8) == 'friends/') {
    update.friends(req);
  } else if(req.data.name.substr(0, 7) == 'people/') {
    update.list(req);
  } else {
    update.members(req, 1);
  }
});

// Searching for a game
app.get('/!/check', auth.groupcheck);

app.io.route('storesearch', store.search);

// Ask for the wishlist of a single person.
app.io.route('?', update.wishlist);
app.io.route('games?', update.games);

// ask for the owned games of a single person
app.io.route('owned?', update.owned);

// Redirect all /group/* to /*
app.get('/group/:name', function(req, res) {
    res.redirect('/' + req.params.name);
});

// Login
app.get('/', auth.home);
app.get('/!', auth.openid);
app.get('/!/auth', auth.verify);
app.get('/!/logout', auth.logout);


// Donating... just static, really.
app.get('/!/donate', function(req, res) {
  res.render('donate.jade');
});

// Send the file to do all the client-side processing
var nameregex = '([\\d\\w\\-]+)';
app.get('/friends/:user' + nameregex + '/:app(\\d+)', function(req, res) {
  res.render('check.jade', {group: 'friends/' + req.params.user, app: req.params.app});
});

app.get('/friends/:user' + nameregex + '/check', auth.groupcheck);

app.get('/friends/:user' + nameregex, function(req, res) {
  res.render('wishlist.jade', {group: 'friends/' + req.params.user});
});

app.get('/people/:people/:app(\\d+)', function(req, res) {
  res.render('check.jade', {group: 'people/' + req.params.people, app: req.params.app});
});

app.get('/people/:people', function(req, res) {
  res.render('wishlist.jade', {group: 'people/' + req.params.people});
});

app.get('/people', auth.selectfriends);

app.get('/:group' + nameregex + '/:app(\\d+)', function(req, res) {
  res.render('check.jade', {group: req.params.group, app: req.params.app});
})

app.get('/:group' + nameregex + '/check', auth.groupcheck);

app.get('/:group' + nameregex, function(req, res) {
  res.render('wishlist.jade', {group: req.params.group});
});

var ip = process.env.OPENSHIFT_NODEJS_IP || process.env.IP || '127.0.0.1'
var port = process.env.OPENSHIFT_INTERNAL_PORT || process.env.PORT || 8080;
app.listen(port, ip);
console.log('Lets listen on ' + ip + ':' + port);
