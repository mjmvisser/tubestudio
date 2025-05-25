import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import Tooltip from 'primevue/tooltip';
import App from './App.vue';

import "primeflex/primeflex.css";
import "./assets/main.css";

import { createWebHistory, createRouter } from 'vue-router'
import LoadLineChart from './components/LoadLineChart.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/:tubeName?/', component: LoadLineChart },
  ]
});

createApp(App)
  .use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        prefix: 'p',
        darkModeSelector: false,
        cssLayer: false
      }
    }
  })
  .use(router)
  .directive('tooltip', Tooltip)
  .mount('#app');

