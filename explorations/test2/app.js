YUI().use('node', 'event', function(Y) {
    var w = parseFloat(Y.one('#field').getComputedStyle('width'));
    var h = parseFloat(Y.one('#field').getComputedStyle('height'));
    var els = [];
    for (var i = 1; i <= 7; i++) {
        els[i] = Y.one('#el'+i);
        els[i].setStyle('top', 1/7*(i-1)*h)
              .setStyle('left', 1/7*(i-1)*w)
              .setStyle('width', 1/7*.8*w)
              .setStyle('height', 1/7*.8*h);
        els[i].on('mousedown', function(e) {
            console.log('mousedown ev', e, 'this', this);
            this.addClass('highlight');
        });
        els[i].on('mouseup', function(e) {
            console.log('mouseup ev', e, 'this', this);
            this.removeClass('highlight');
        });
        jsPlumb.makeSource('el'+i);
        jsPlumb.makeTarget('el'+i, {anchor: 'Continuous'});
    }
    console.log('els', els);
});
