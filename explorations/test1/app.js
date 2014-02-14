jsPlumb.bind('ready', function() {
    console.log('hey there');
    jsPlumb.Defaults.Container = $('#field');
    var $field = $('#field');
    var w = $field.width();
    var h = $field.height();
    var $els = [];
    var points = [];
    for (var i = 1; i <= 7; i++) {
        $els[i] = $('#el'+i).css({top: 1/7*(i-.5)*h, left: 1/7*(i-.5)*w});
        jsPlumb.addEndpoint($els[i]);
        jsPlumb.draggable($els[i]);
    }
    console.log('points',points);
    console.log('els', $els);

    jsPlumb.connect({source: $els[1], target: $els[2]});
});
