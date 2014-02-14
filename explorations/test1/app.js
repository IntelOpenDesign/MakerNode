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
    }
    console.log('points',points);
    console.log('els', $els);

    jsPlumb.makeSource($('.el'));
    jsPlumb.makeTarget($('.el'), {anchor: 'Continuous'});

    $('.el').on('mousedown', function(ev) {
        console.log('mousedown ev', ev, 'this', this);
        $(this).addClass('highlight');
    });
    $('.el').on('mouseup', function(ev) {
        console.log('mouseup ev', ev, 'this', this);
        $(this).removeClass('highlight');
    });
});
