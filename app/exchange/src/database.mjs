// Small IndexedDB adapter: transaction completion is the persistence boundary.
export function openDatabase(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('golden-hub-osrs-v4',1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records');};
  request.onerror=()=>reject(request.error||Error('Cannot open local database'));
  request.onblocked=()=>reject(Error('Another app window is blocking a database upgrade. Close it and reopen.'));
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
 });
}
export function databaseGet(db,key){return new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly'),r=tx.objectStore('records').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export function databasePut(db,entries){return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Local transaction failed'));tx.onabort=()=>reject(tx.error||Error('Local transaction aborted; nothing saved'));try{for(const [key,value] of entries)tx.objectStore('records').put(value,key);}catch(e){tx.abort();reject(e);}});}
export function databaseErase(db,personal){return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Deletion failed'));tx.onabort=()=>reject(tx.error||Error('Deletion aborted'));const store=tx.objectStore('records');store.clear();store.put(personal,'personal');});}
