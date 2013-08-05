$(function() {
  io = io.connect((window.location.hostname == 'swl.mabako.net' || window.location.hostname == 'steamwishlist.mabako.net' || window.location.hostname.indexOf('rhcloud.com') > 0) ? (window.location.hostname + ':8000') : null);

  var lastSearched = '';
  io.on('storesearched', function(data) {
    if(data.input != $('#game').val())
      return;

    var obj = $('#auto');
    obj.empty();
    console.dir(data.result);
    for(var i = 0; i < data.result.length; ++ i) {
      var p = $('<p>').appendTo(obj);

      var app = data.result[i].app;
      var name = data.result[i].name;

      $('<input type="radio" name="app">').attr('id', 'a_' + app).attr('data-app', app).attr('value', name).attr('checked', i == 0).appendTo(p);
      $('<label>').attr('for', 'a_' + app).text(name).appendTo(p);
    }
    updateLink();
  });

  var inputTimer = null;
  $('#game').bind('keyup change', function() {
    var val = $(this).val();
    if(val == lastSearched)
      return;
    lastSearched = val;

    if(inputTimer)
      clearTimeout(inputTimer);

    inputTimer = setTimeout(function(){
      inputTimer = null;
      console.log('searching ' + val);
      io.emit('storesearch', val);
    }, 200);
  });

  // Selecting a group
  function updateLink() {
    var group = $('input[name=group]:checked').attr('data-url');
    var friends = $('input[name=friend]:checked');
    var app = $('input[name=app]:checked').attr('data-app');

    var link = '#';
    if($('input[name=group]').length > 0) {
      if('history' in window && 'replaceState' in window.history && window.history['replaceState'] !== null) {
        window.history.replaceState({}, '', '/' + (group || '!') + '/check');
      }
      if(group && app) {
        link = '/' + group + '/' + app;
      }
    } else if(friends.length > 0) {
      friends.each(function() {
        var url = $(this).attr('data-url');
        link = link == '#' ? ('/people/' + url) : (link + ',' + url)
      });
      if(app) {
        link += '/' + app;
      }
    }
    $('#sel').attr('href', link);
  }
  $('#auto').change(updateLink);
  $('input[name=group]').change(updateLink);
  $('input[name=friend]').change(updateLink);

  $('#g2').bind('keyup change', function() {
    $('#g1').attr('data-url', $('#g2').val());
    updateLink();
  });
});