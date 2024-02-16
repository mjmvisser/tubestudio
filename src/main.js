import 'primevue/resources/themes/bootstrap4-light-blue/theme.css';

import { createApp } from 'vue';
import PrimeVue from "primevue/config";
import "primeflex/primeflex.css";
import App from './App.vue';

createApp(App)
  .use(PrimeVue)
  .mount('#app');
