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
      var url = /^\d{17}$/.test(data.profile) ? ('profiles/' + data.profile) : ('id/' + data.profile);
      var linktext = '<a href="http://steamcommunity.com/' + url + '/" target="_blank"' +
        (data.star ? ' class="star"' : '') + '>' + data.name + '</a>';
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
      document.getElementById('peoplec').innerHTML = offset + '/' + members.length + ' &mdash; ';
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
