// Cleaneh entry point.

import { startApp } from './ui/app.js';
import { setUpServiceWorker } from './ui/service-worker.js';

setUpServiceWorker();
startApp(document.getElementById('app'));
