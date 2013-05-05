$(function() {
  io = io.connect()

  // Emit ready event.
  io.emit('Hi-diddly-ho, neighborino', window.location.pathname.substr(1)); 

  var members = [];
  var offset = 0;

  // apps[appId] => {name, price}
  var apps = {};
  var curr = {};

  function processCurrentMember() {
    var linktext = '<a href="http://steamcommunity.com/profiles/' + curr.profile + '/" target="_blank">' + curr.name + '</a>';
    for(var i = 0; i < curr.games.length; ++ i) {
      var game = curr.games[i];
      var obj = $('#g' + game);
      $('.cnt', obj).text(parseInt($('.cnt', obj).text()) + 1);
      
      var people = $('.ppl', obj);
      if(people.text().length > 0) {
        people.append(', ' + linktext);
      } else {
        people.append(linktext);
      }
    }
    sortStuff();
    processNext();
  }
  
  function sortStuff() {
    $('#games > div').sortElements(function(a, b){
      var pa = parseInt($('.cnt', a).text());
      var pb = parseInt($('.cnt', b).text());
      return pa < pb ? 1 : pa > pb ? -1 : $('.n a', a).text() > $('.n a', b).text() ? 1 : -1;
    });
  }

  function checkGameInfo(data) {
    var toFetch = [];
    for(var i = 0; i < data.games.length; ++ i) {
      if(apps[data.games[i]] == undefined) {
        toFetch[toFetch.length] = data.games[i];
      }
    }
    
    curr = data;
    if(toFetch.length > 0) {
      io.emit('games?', toFetch);
    } else {
      processCurrentMember()
    }
  }

  function updateCounter() {
    document.getElementById('people').innerHTML = offset + '/' + members.length;
  }

  io.on('m', function(data) {
    members = members.concat(data);
    updateCounter();
  });

  function processNext() {
    var e = members[offset++];
    if(e == null) return;
    io.emit('?', e);
  }

  io.on('k', function() {
    processNext();
  });

  io.on('u', function(data) {
    checkGameInfo(data);
    updateCounter();
  });

  io.on('games!', function(data) {
    for(var i in data) {
      apps[i] = data[i];
      createGame(i, apps[i]);
    }
    processCurrentMember();
  });

  function createGame(id, data) {
    $('#games').append('<div id="g' + id + '"><a href="http://store.steampowered.com/app/' + id + '" target="_blank"><img src="' + data.image + '"/></a><div><div class="cnt">0</div><div class="pr">' + data.price + '</div><div class="n"><a href="http://store.steampowered.com/app/' + id + '" target="_blank">' + data.name + '</a></div><div class="ppl"></div></div></div>');
  }
});
