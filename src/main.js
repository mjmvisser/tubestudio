import 'primevue/resources/themes/bootstrap4-light-blue/theme.css';

import { createApp } from 'vue';
import PrimeVue from "primevue/config";
import "primeflex/primeflex.css";
import "./assets/main.css";
import Tooltip from 'primevue/tooltip';
import App from './App.vue';

createApp(App)
  .use(PrimeVue)
  .directive('tooltip', Tooltip)
  .mount('#app');
