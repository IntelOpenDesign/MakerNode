function mobile_draggable($el) {
    // touchstart is getting translated to mousedown and logged as such on mobile phone
    $el.on('touchstart', function(e) {
        e.type = 'mousedown';
        $el.trigger(e);
    });
    // why is this not working?
    $el.on('touchmove', function(e) {
        e.stopPropagation();
        e.type = 'drag';
        //$el.trigger(e); // this does not even trigger the drag event logging
        $el.trigger('drag'); // this triggers the drag event logging below but does not make it drag
    });
    // never get touchend events anyway so it makes sense that we aren't seeing any mouseup events on mobile phone
    $el.on('touchend', function(e) {
        e.type = 'mouseup';
        $el.trigger(e);
    });

    $el.draggable();
}

$(document).on('pageinit', function(e) {
    var $events_log = $('.events-log').first();
    var $box = $('.box');

    // log events
    function event_handler(e) {
        //e.stopPropagation();
        console.log('event', e.type, e);
        $events_log.prepend(e.type + '<br>');
    }
    var events = ['drag', 'dragstart', 'dragend', 'touchstart', 'touchend', 'touchmove', 'mousedown', 'mouseup'];
    _.each(events, function(e) {
        $box.on(e, event_handler);
    });

    mobile_draggable($box);
});
