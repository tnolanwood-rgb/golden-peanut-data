import {build} from 'esbuild';
await build({entryPoints:['app/exchange/src/app.mjs'],bundle:true,format:'esm',outfile:'app/exchange/desk.mjs',target:['chrome109'],minify:false});
