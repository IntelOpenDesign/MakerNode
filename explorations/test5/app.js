jsPlumb.bind('ready', function() {
    console.log('hey there');
    jsPlumb.Defaults.Container = $('#field');
    var $field = $('#field');
    var w = $field.width();
    var h = $field.height();
    var $els = [];
    var points = [];
    for (var i = 1; i <= 7; i++) {
        $els[i] = $('#el'+i).css({
            top: 1/7*(i-1)*h,
            left: 1/7*(i-1)*w,
            width: 1/7*.8*w,
            height: 1/7*.8*h,
        });
    }

    jsPlumb.makeSource($('.el'));
    jsPlumb.makeTarget($('.el'), {anchor: 'Continuous'});

    /*
    $('.el').on('mousedown', function(ev) {
        console.log('mousedown');
        var $this = $(this);
        var $others = $('.el.highlight');
        if ($others.length > 1) {
            console.log('more than one highlighted el found');
            alert('BUG: too many activated elements. deactivating all of them.');
            $('.el').removeClass('highlight');
        } else if ($others.length === 1 && $others.first().attr('id') !== $this.attr('id')) {
            console.log('exactly one highlighted el found, and it is not the same as the one we just clicked');
            var $other = $others.first();
            jsPlumb.connect({source:$other, target:$this});
            $('.el').removeClass('highlight');
        } else {
            console.log('no highlighted el found, or there is one but it is the one we just clicked');
            $this.toggleClass('highlight');
        }
    });
    */

    $('.el').on('tap', function(e) { $('#debug-text').append('tap '); });
    $('.el').on('taphold', function(e) { $('#debug-text').append('taphold '); });
    $('.el').on('vmousedown', function(e) { $('#debug-text').append('vmousedown '); });

});
