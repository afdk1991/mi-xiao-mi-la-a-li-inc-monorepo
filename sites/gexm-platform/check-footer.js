(function(){
  const f=document.querySelector('footer.footer');
  if(!f) return JSON.stringify({error:'no footer'});
  const cs=getComputedStyle(f);
  const result={
    bg: cs.backgroundColor,
    backgroundImage: cs.backgroundImage,
    color: cs.color
  };
  const matchedRules=[];
  for(const sheet of document.styleSheets){
    try{
      for(const rule of sheet.cssRules){
        if(!rule.selectorText) continue;
        try{
          if(f.matches(rule.selectorText)){
            if(rule.style && rule.style.length>0){
              const styles={};
              for(let i=0;i<rule.style.length;i++){
                const prop=rule.style[i];
                styles[prop]=rule.style.getPropertyValue(prop);
              }
              matchedRules.push({
                selector:rule.selectorText,
                styles:styles,
                href:sheet.href?sheet.href.split('/').pop():'inline'
              });
            }
          }
        }catch(e){}
      }
    }catch(e){}
  }
  return JSON.stringify({computedProps:result, matchedRules:matchedRules.slice(-8)});
})();
