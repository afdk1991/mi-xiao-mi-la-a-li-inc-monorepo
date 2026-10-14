import { defineConfig } from '@umijs/max';

export default defineConfig({
  routes: [
    {
      path: '/user',
      layout: false,
      routes: [
        {
          path: '/user/login',
          name: 'login',
          component: './mixmlaal-admin-pages-user/Login',
        },
        {
          path: '/user/register',
          name: 'register',
          component: './mixmlaal-admin-pages-user/Register',
        },
      ],
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      icon: 'Dashboard',
      component: './Dashboard',
    },
    {
      path: '/admin',
      name: 'admin',
      icon: 'User',
      routes: [
        {
          path: '/admin/user',
          name: 'user',
          component: './mixmlaal-admin-pages-admin/User',
        },
        {
          path: '/admin/role',
          name: 'role',
          component: './mixmlaal-admin-pages-admin/Role',
        },
        {
          path: '/admin/permission',
          name: 'permission',
          component: './mixmlaal-admin-pages-admin/Permission',
        },
      ],
    },
    {
      path: '/statistics',
      name: 'statistics',
      icon: 'LineChart',
      component: './Statistics',
    },
    {
      path: '/profile',
      name: 'profile',
      icon: 'User',
      component: './Profile',
    },
    {
      path: '*',
      component: './404',
    },
  ],
  npmClient: 'npm',
  proxy: {
    '/api': {
      target: 'http://localhost:8081',
      changeOrigin: true,
    },
  },
  mock: false,
  title: 'MIXMLAAL Admin',
});
