import pg from 'pg';
import { readFileSync } from 'node:fs';
const fixture = [
  ['LEG-101','banana',120000,420000],
  ['LEG-102','tomato',80000,216000],
  ['LEG-103','mango',60000,510000],
];
// Isolated disposable database. No live workspace data, arbitrary queries, or secret output.
export async function handler(event: {action?:string}) {
  if (!['seed','verify'].includes(event.action || '')) return {error:'SUPPORTED_ACTION_REQUIRED'};
  const client=new pg.Client({host:process.env.DB_HOST,port:5432,database:'freshroute_lab',user:'freshroute_lab_owner',password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:true,ca:readFileSync('/var/task/rds-ca.pem','utf8')},connectionTimeoutMillis:8000,query_timeout:15000});
  try {
    await client.connect();
    if(event.action==='seed') {
      await client.query('BEGIN');
      await client.query('CREATE SCHEMA IF NOT EXISTS legacy; CREATE SCHEMA IF NOT EXISTS warehouse; CREATE TABLE IF NOT EXISTS legacy.shipments (id varchar(32) PRIMARY KEY, produce varchar(32) NOT NULL, quantity_grams integer NOT NULL, value_paise integer NOT NULL)');
      for (const row of fixture) await client.query('INSERT INTO legacy.shipments VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET produce=EXCLUDED.produce, quantity_grams=EXCLUDED.quantity_grams, value_paise=EXCLUDED.value_paise',row);
      await client.query('COMMIT');
    }
    const source=(await client.query('SELECT * FROM legacy.shipments ORDER BY id')).rows;
    const exists=(await client.query("SELECT to_regclass('warehouse.shipments') IS NOT NULL AS present")).rows[0].present;
    const target=exists?(await client.query('SELECT * FROM warehouse.shipments ORDER BY id')).rows:[];
    const tls=(await client.query('SELECT ssl,version FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0];
    return {sourceRows:source.length,targetRows:target.length,identical:JSON.stringify(source)===JSON.stringify(target),source,target,tls,fixtureOnly:true};
  } catch(error) {
    // Error messages may contain connection information; return a safe class/code only.
    return {error:'SQL_LAB_FAILED',code:(error as {code?:string}).code || 'CONNECTION_OR_QUERY'};
  } finally {await client.end().catch(()=>undefined);}
}
