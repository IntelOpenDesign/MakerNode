$(document).on('pageinit', function(e) {
    var $events_log = $('.events-log').first();
    var $box = $('.box');

    $box.on('touchmove', function(e) {
        $events_log.append('touchmove ');
        console.log('touchmove event', e);
        var window_event = window.event;
        console.log('touchmove window event', window_event);
    });
});
