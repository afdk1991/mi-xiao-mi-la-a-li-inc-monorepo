JSON.stringify({
  postItems: (() => {
    const items = document.querySelectorAll('.zib-widget .item, .post-list .item, .posts-list .item, article');
    if (!items.length) return 'no items found';
    const first = items[0];
    const parent = first.parentElement;
    const parentCS = getComputedStyle(parent);
    const cardCS = getComputedStyle(first);
    return {
      count: items.length,
      parentClass: parent.className,
      parentDisplay: parentCS.display,
      parentGridTemplateColumns: parentCS.gridTemplateColumns,
      parentGap: parentCS.gap,
      cardClass: first.className,
      cardBg: cardCS.backgroundColor,
      cardBorderRadius: cardCS.borderRadius,
      cardBoxShadow: cardCS.boxShadow,
      cardPadding: cardCS.padding,
      cardDisplay: cardCS.display,
      cardFlexDirection: cardCS.flexDirection,
      cardWidth: cardCS.width
    };
  })(),
  themeColor: (() => {
    const root = document.documentElement;
    return getComputedStyle(root).getPropertyValue('--primary-color') || 
           getComputedStyle(root).getPropertyValue('--theme-color') ||
           getComputedStyle(root).getPropertyValue('--main-color') ||
           'not found';
  })(),
  cssVars: (() => {
    const root = document.documentElement;
    const vars = {};
    const styles = getComputedStyle(root);
    ['--primary-color', '--theme-color', '--main-color', '--accent-color', '--text-color', '--bg-color', '--card-bg', '--border-color'].forEach(v => {
      const val = styles.getPropertyValue(v);
      if (val) vars[v] = val.trim();
    });
    return vars;
  })(),
  headerStructure: (() => {
    const header = document.querySelector('header, .header, #header');
    if (!header) return null;
    return {
      class: header.className,
      innerHTML: header.innerHTML.substring(0, 500)
    };
  })()
})
