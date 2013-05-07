start = function(groupName, app) {
  var _app = app;
  commonInit(app, groupName, function(members) {
    var app = parseInt(_app);
    var offset = 0;

    // members are only cached if the group has less than 200 members.
    var cacheMembers = g.supportLocalStorage && members.length < g.cacheMembersCount;

    function processCurrentMember(data) {
      updateCounter();
      processNext();
      var linktext = '<a href="http://steamcommunity.com/profiles/' + data.profile + '/" target="_blank">' + data.name + '</a>';
      var container = 'haznot'
      if(data.games == null)
        container = 'private';
      else if(data.games[parseInt(app)])
        container = 'haz';

      var obj = $('#' + container);
      $('.cnt', obj).text(parseInt($('.cnt', obj).text()) + 1);

      $('.ppl', obj).append(linktext);
    }

    function updateCounter() {
      document.getElementById('people').innerHTML = offset + '/' + members.length + ' &mdash; You may want to visit the <a href="http://www.steamgifts.com/forum/UHlGN" target="_blank">forum topic</a>.';
    }

    function processNext() {
      var e = members[offset];
      if(e == null) return;
      ++ offset;

      if(cacheMembers) {
        var storedMember = localStorage['o-' + e];
        if(storedMember) {
          var timestamp = storedMember.substr(0, 13);
          if(parseInt(timestamp) > g.now) {
            var obj = JSON.parse(storedMember.substr(13));
            processCurrentMember(obj);
            return;
          }
        }
      }
      io.emit('owned?', e);
    }

    io.on('owned!', function(data) {
      processCurrentMember(data);

      if(cacheMembers) {
        var timestamp = new Date();
        timestamp.setDate(timestamp.getDate() + g.cacheMembersInDays);
        localStorage['o-' + data.profile] = timestamp.getTime() + JSON.stringify(data);
      }
    });

    processNext();
  });
};
