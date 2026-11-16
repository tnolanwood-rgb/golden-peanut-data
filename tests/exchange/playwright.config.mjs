import fs from 'node:fs';
import {chromium} from 'playwright-core';
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./ui',timeout:30000,workers:2,use:{baseURL:'http://127.0.0.1:8091',viewport:{width:390,height:844},isMobile:true,hasTouch:true,launchOptions:{executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),args:['--no-sandbox']},trace:'retain-on-failure'},webServer:{cwd:new URL('../..',import.meta.url).pathname,command:'python3 -m http.server 8091 --bind 127.0.0.1 --directory app/exchange',url:'http://127.0.0.1:8091',reuseExistingServer:false},reporter:'list'});
