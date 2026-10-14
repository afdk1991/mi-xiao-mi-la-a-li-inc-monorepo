(function(){
  var c = document.querySelector('.post-card');
  if(!c) return JSON.stringify({error: 'no card'});
  var result = {};
  for(var i=0; i<document.styleSheets.length; i++){
    var sheet = document.styleSheets[i];
    try{
      for(var j=0; j<sheet.cssRules.length; j++){
        var rule = sheet.cssRules[j];
        if(!rule.selectorText) continue;
        try{
          if(c.matches(rule.selectorText)){
            if(rule.style && rule.style.border){
              var href = sheet.href ? sheet.href.split('/').pop() : 'inline';
              result[rule.selectorText] = {border: rule.style.border, href: href};
            }
          }
        }catch(e){}
      }
    }catch(e){}
  }
  return JSON.stringify(result);
})();
