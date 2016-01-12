$(document).foundation();
$(document).ready(init);

function init() {
  $('.fade').fadeOut('slow');
  $('a.local').click(smoothScroll);
}

function smoothScroll(e){
  $('html, body').animate({
    scrollTop: $( $(e.target).attr('href') ).offset().top
  }, 500);
  return false;
}
