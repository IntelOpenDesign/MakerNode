// helper function to have $el listen to tap and taphold events
// taphold events tend to be quickly followed by a tap event
// this helper function ignores those extraneous tap events
function listen_to_tap_and_taphold($el, tap_handler, taphold_handler, context) {
    var taps_are_valid = true;
    $el.on('tap', function(e) {
        if (taps_are_valid) {
            tap_handler.call(context);
        } else {
            taps_are_valid = true;
        }
    });
    $el.on('taphold', function(e) {
        taps_are_valid = false;
        taphold_handler.call(context);
    });
}

$(document).on('pageinit', function(e) {
    console.log('paginit event', e);
    var $events_log = $('.events-log').first();
    var $box = $('.box');
    /*
    function event_handler(e) {
        console.log('event', e.type, e);
        $events_log.prepend(e.type + '<br>');
    }
    var events = ['click', 'mousedown', 'mouseup', 'dblclick', 'tap', 'taphold'];
    _.each(events, function(event) {
        $box.on(event, event_handler);
    });
    */
    var contextual_var = 'CTX';
    var tapped = function(e) {
        $events_log.prepend('tapped' + contextual_var + '<br>');
    };
    var tapheld = function(e) {
        $events_log.prepend('tapheld' + contextual_var + '<br>');
    };
    listen_to_tap_and_taphold($box, tapped, tapheld, this);
});
