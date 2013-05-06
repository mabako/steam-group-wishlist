$(function() {
  io = io.connect((window.location.origin == 'http://swl.mabako.net' || window.location.origin.indexOf('rhcloud.com') > 0) ? (window.location.origin + ':8000') : null);

  // Emit ready event.
  io.emit('Hi-diddly-ho, neighborino', window.location.pathname.substr(1)); 

  var members = [];
  var offset = 0;

  // apps[appId] => {name, price}
  var apps = {};
  var curr = {};
  
  // If localStorage is support, both member information and game information are stored on your own computer.
  var supportLocalStorage = 'localStorage' in window && window['localStorage'] !== null;
  var cacheEverythingInDays = 15;

  var cacheMembers = false;
  // members are only cached if the group has less than 200 members.
  var cacheMembersCount = 200;
  var cacheMembersInDays = 3;

  var now = new Date().getTime(); // Guaranteed to be wrong about every second after the initial request, but is conceptually close enough to verify days of cache.

  (function() {
    if(supportLocalStorage) {
      if(localStorage.expires) {
        if(parseInt(localStorage.expires) < now) {
          console.log('localStorage expired.')
          localStorage.clear();
        } else {
          return;
        }
      }
      var expires = new Date();
      expires.setDate(expires.getDate() + cacheEverythingInDays);
      localStorage.expires = expires.getTime();
    }
  })();

  function processCurrentMember(data) {
    processNext();
    var linktext = '<a href="http://steamcommunity.com/profiles/' + data.profile + '/" target="_blank">' + data.name + '</a>';
    for(var i = 0; i < data.games.length; ++ i) {
      var game = data.games[i];
      var obj = $('#g' + game);
      $('.cnt', obj).text(parseInt($('.cnt', obj).text()) + 1);
      
      var people = $('.ppl', obj);
      if(people.text().length > 0) {
        people.append(', ' + linktext);
      } else {
        people.append(linktext);
      }
    }
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
      if(!apps[data.games[i]]) {
        if(supportLocalStorage) {
          var storedObject = localStorage['game-' + data.games[i]];
          if(storedObject) {
            var obj = JSON.parse(storedObject);
            apps[data.games[i]] = obj;
            createGame(data.games[i], obj);
            continue;
          }
        }
        toFetch[toFetch.length] = data.games[i];
      }
    }
    
    if(toFetch.length > 0) {
      curr[data.profile] = data;
      io.emit('games?', {fetch: toFetch, profile: data.profile});
    } else {
      processCurrentMember(data);
    }
  }

  function updateCounter() {
    document.getElementById('people').innerHTML = offset + '/' + members.length + ' &mdash; You may want to visit the <a href="http://www.steamgifts.com/forum/UHlGN" target="_blank">forum topic</a>.';
    if(offset == members.length) {
      sortStuff();
    }
  }

  io.on('m', function(data) {
    members = members.concat(data);
    updateCounter();
    cacheMembers = supportLocalStorage && members.length < cacheMembersCount;
  });

  function processNext() {
    var e = members[offset];
    if(e == null) return;
    ++ offset;

    if(cacheMembers) {
      var storedMember = localStorage['u-' + e];
      if(storedMember) {
        var timestamp = storedMember.substr(0, 13);
        if(parseInt(timestamp) > now) {
          var obj = JSON.parse(storedMember.substr(13));
          checkGameInfo(obj);
          updateCounter();
          return;
        }
      }
    }
    io.emit('?', e);
  }

  io.on('k', function() {
    processNext();
  });

  io.on('u', function(data) {
    checkGameInfo(data);
    updateCounter();

    if(cacheMembers) {
      var timestamp = new Date();
      timestamp.setDate(timestamp.getDate() + cacheMembersInDays);
      localStorage['u-' + data.profile] = timestamp.getTime() + JSON.stringify(data);
    }

    sortStuff();
  });

  io.on('games!', function(data) {
    for(var i in data.games) {
      apps[i] = data.games[i];
      createGame(i, apps[i]);
      if(supportLocalStorage) {
        localStorage['game-' + i] = JSON.stringify(apps[i]);
      }
    }
    var d = curr[data.profile];
    curr[data.profile] = null;
    processCurrentMember(d);
  });

  function createGame(id, data) {
    $('#games').append('<div id="g' + id + '"><a href="http://store.steampowered.com/app/' + id + '" target="_blank"><img src="' + data.image + '"/></a><div class="r"><div class="cnt">0</div><div class="pr">' + data.price + '</div><div class="n"><a href="http://store.steampowered.com/app/' + id + '" target="_blank">' + data.name + '</a></div><div class="ppl"></div></div></div>');
  }
});
