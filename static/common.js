g = {
  // If localStorage is supported, both member information and game information are stored on your own computer.
  supportLocalStorage: 'localStorage' in window && window['localStorage'] !== null,
  cacheEverythingInDays: 15,
  cacheMembersCount: 200,
  cacheMembersInDays: 3,

  // Guaranteed to be wrong about every second after the initial request, but is conceptually close enough to verify days of cache.
  now: new Date().getTime()
};

(function() {
  if(g.supportLocalStorage) {
    if(localStorage.expires) {
      if(parseInt(localStorage.expires) < g.now) {
        console.log('localStorage expired.')
        localStorage.clear();
      } else {
      }
    }
    var expires = new Date();
    expires.setDate(expires.getDate() + g.cacheEverythingInDays);
    localStorage.expires = expires.getTime();
  }
})();


function commonInit(index, groupName, func) {
  io = io.connect((window.location.hostname == 'swl.mabako.net' || window.location.hostname.indexOf('rhcloud.com') > 0) ? (window.location.hostname + ':8000') : null);

  var members = [];
  io.on('m', function(data) {
    members = members.concat(data);
  });

  io.emit('Hi-diddly-ho, neighborino', {name: groupName, index: index});

  io.on('k', function() {
    func(members);
  });

  io.on('t', function(data) {
    $('h1').text(data);
  });

  io.on('err', function(data) {
    $('<div>').insertAfter($('h1')).text(data).addClass('err');
  });
}
