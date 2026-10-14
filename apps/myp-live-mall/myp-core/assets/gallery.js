// MYP 后台多图上传
jQuery(function ($) {
  var frame;
  $(document).on('click', '.myp-gallery-add', function (e) {
    e.preventDefault();
    var $input = $($(this).data('target'));
    if (frame) { frame.open(); return; }
    frame = wp.media({ title: '选择图片', multiple: true });
    frame.on('select', function () {
      var ids = $input.val() ? $input.val().split(',') : [];
      frame.state().get('selection').each(function (att) { ids.push(att.id); });
      $input.val(ids.join(','));
    });
    frame.open();
  });
});
