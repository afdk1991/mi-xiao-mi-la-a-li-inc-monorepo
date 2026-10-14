JSON.stringify({
  bodyClass: document.body.className,
  htmlClass: document.documentElement.className,
  dataTheme: document.body.dataset.theme || document.documentElement.dataset.theme || 'none',
  bodyBg: getComputedStyle(document.body).backgroundColor,
  colorBgVar: getComputedStyle(document.documentElement).getPropertyValue('--color-bg'),
  allBgVars: (() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      '--color-bg': cs.getPropertyValue('--color-bg'),
      '--main-bg-color': cs.getPropertyValue('--main-bg-color'),
      '--bg-bg-base-default': cs.getPropertyValue('--bg-bg-base-default'),
      '--bg-bg-card': cs.getPropertyValue('--bg-bg-card')
    };
  })(),
  stylesheets: Array.from(document.styleSheets).map(s => s.href).filter(h => h)
})
