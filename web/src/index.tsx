/* Modified by noname009 (https://github.com/noname009) in 2026.
 * Part of a GPL-3.0 fork of https://github.com/jeonghyeon-net/exif-frame. */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from 'konsta/react';
import Router from './router';

import './index.css';
import './ef-design.css';
import './locales';
import './fonts';
import './update-latest-version';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App theme="ios" safeAreas>
      <Router />
    </App>
  </React.StrictMode>
);