1. 移除header.php中第138行的`<div class="container">`和第253行的对应闭合标签
2. 移除第139行的`<div class="flex items-center justify-between">`和第234行的对应闭合标签
3. 确保移除后，header的直接子元素（site-branding、main-navigation、zibll-navbar-right、zibll-mobile-menu-container）仍能保持合理布局
4. 检查样式是否需要调整，确保导航栏在移除容器div后仍能正常显示

