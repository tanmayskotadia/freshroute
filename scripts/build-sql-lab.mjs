import {build} from 'esbuild';
import {mkdirSync,copyFileSync} from 'node:fs';
mkdirSync('build/sql-lab',{recursive:true});
await build({entryPoints:['server/sqlLab.ts'],outfile:'build/sql-lab/sqlLab.mjs',bundle:true,platform:'node',target:'node24',format:'esm',minify:true,external:['pg-native'],banner:{js:"import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);"}});
copyFileSync('infrastructure/labs/rds-ca.pem','build/sql-lab/rds-ca.pem');
