import 'primevue/resources/themes/bootstrap4-light-blue/theme.css';
import { createApp } from 'vue';
import PrimeVue from "primevue/config";
import "primeflex/primeflex.css";
import "./assets/main.css";
import Tooltip from 'primevue/tooltip';

import App from './App.vue';

import { createWebHistory, createRouter } from 'vue-router'
import LoadLineChart from './components/LoadLineChart.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/loadline/:tubeName?/', component: LoadLineChart },
    { path: '/', redirect: '/loadline/' }
  ]
});

createApp(App)
  .use(PrimeVue)
  .use(router)
  .directive('tooltip', Tooltip)
  .mount('#app');

