let renderCount=0;
const _inputs={};
global.document = {
  getElementById: (id) => (id==='app'
    ? { set innerHTML(v){ renderCount++; }, get innerHTML(){ return ''; } }
    : (_inputs[id]!==undefined ? { value:_inputs[id] } : null)),
};
global.setTimeout = (fn)=>setImmediate(fn);
function setInput(id,v){ _inputs[id]=v; }
/* in-memory localStorage, with a switch to simulate a browser that blocks it */
let _store={}, _blocked=false;
global.window = { localStorage: {
  setItem:(k,v)=>{ if(_blocked) throw new Error('denied'); _store[k]=String(v); },
  getItem:(k)=>{ if(_blocked) throw new Error('denied'); return Object.prototype.hasOwnProperty.call(_store,k)?_store[k]:null; },
  removeItem:(k)=>{ if(_blocked) throw new Error('denied'); delete _store[k]; },
}};
function blockStorage(b){ _blocked=b; }
function rawStore(){ return _store; }
global.btoa = (str)=>Buffer.from(str,'binary').toString('base64');
global.atob = (b64)=>Buffer.from(b64,'base64').toString('binary');
