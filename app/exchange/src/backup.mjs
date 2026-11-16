import {validateBackup} from './storage.mjs';
// Merge identity-bearing journals only. Never deduplicate legitimate equal fills by value.
export function mergeJournal(current,incoming){
 if(incoming.format!=='golden-exchange-backup-v3')throw Error('Merge needs a v3 backup with stable transaction IDs. Older backups can be restored by replacement.');
 const clean=validateBackup(incoming),base=validateBackup({...current,format:'golden-exchange-backup-v3'});
 const rows=new Map(base.trades.map(t=>[t.uid,t]));let added=0;
 for(const t of clean.trades){if(rows.has(t.uid)){if(JSON.stringify(rows.get(t.uid))!==JSON.stringify(t))throw Error('Conflicting transaction ID: '+t.uid+'. Restore a chosen backup instead; no records changed.');}else{rows.set(t.uid,t);added++;}}
 const result=validateBackup({...current,format:'golden-exchange-backup-v3',trades:[...rows.values()],watch:[...new Set([...base.watch,...clean.watch])]});
 return {...result,added};
}
