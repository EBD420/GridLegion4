let pass=0, fail=0;
function ok(name, cond, extra){ if(cond){pass++; console.log('  PASS',name);} else {fail++; console.log('  FAIL',name, extra===undefined?'':extra);} }
