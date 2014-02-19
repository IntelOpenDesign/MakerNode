$(document).on('pageinit', function(e) {
    console.log('paginit event', e);
    var $events_log = $('.events-log').first();
    var $box = $('.box');
    $box.draggable();
    function event_handler(e) {
        e.stopPropagation();
        console.log('event', e.type, e);
        $events_log.prepend(e.type + '<br>');
    }
    var events = ['drag', 'dragstart', 'dragend', 'touchstart', 'touchend', 'touchmove'];
    _.each(events, function(e) {
        $box.on(e, event_handler);
    });
});
