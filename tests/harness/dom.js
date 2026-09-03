let renderCount=0;
global.document = { getElementById: () => ({ set innerHTML(v){ renderCount++; }, get innerHTML(){ return ''; } }) };
global.setTimeout = (fn)=>setImmediate(fn);
