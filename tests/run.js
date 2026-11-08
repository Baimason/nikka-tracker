/* Pruebas de Nikka. Uso:  npm install  y después  npm test
   Opcional: NIKKA_SAVE=ruta/a/respaldo.txt npm test  (prueba también con un respaldo
   NIKKA1 real; el archivo nunca se sube al repo).
   Cada bloque imprime OK o la lista de fallas; al final sale con código 1 si algo falló,
   así GitHub Actions marca el commit en rojo. */
const fs = require('fs');
const vm = require('vm');
const { ready, setDayOffset, FILE } = require('./harness');

let failures = 0;
function report(name, problems) {
  if (problems.length) { failures += problems.length; console.log('✗ ' + name); problems.slice(0, 15).forEach(p => console.log('    - ' + p)); if (problems.length > 15) console.log('    … y ' + (problems.length - 15) + ' más'); }
  else console.log('✓ ' + name);
}

/* Estado de usuario intermedio armado con las funciones de la propia app:
   kana completo, unas 400 palabras en distintas cajas, frases y kanji activados. */
const MID_STATE = `(function(){
  var k=ensureKana(); k.level=6; Object.keys(k.scope).forEach(function(s){k.scope[s]=true;}); k.kataIntroSeen=true; k.yoonIntroSeen=true; k.sokuonSeen=true; k.choonSeen=true;
  activePairs().forEach(function(p){ k.learned[learnedKey(p.script,p.romaji)]=true; boxFor(p.script)[p.romaji]=4+(p.romaji.length%2); });
  var w=ensureWords(); if(!w.seen)w.seen={}; WORD_POOL.slice(0,400).forEach(function(x,i){ w.box[x.jp]=1+(i%5); w.seen[x.jp]=1; });
  state.phrasesOn=true; state.kanjiOn=true; var pt=ensurePatterns(); PATTERNS.slice(0,15).forEach(function(p){ pt.seen[p.id]=1; pt.box[p.id]=2; });
  Persistence.save(state); render(); return true; })()`;

async function fuzz(b, start, clicks) {
  const d = b.d; b.ev(start);
  for (let n = 0; n < clicks; n++) {
    const ov = ['reading', 'drill', 'custom'].map(id => d.getElementById(id)).filter(e => e && !e.classList.contains('hidden'));
    let c = []; ov.forEach(o => c.push(...o.querySelectorAll('button:not([disabled]), div[data-r], .tl-chip, .tl-slot')));
    c = c.filter(x => x.style.display !== 'none' && !/d-close|tlClose|prClose|xClose|gear|tlStory|dpClose/.test(x.id + ' ' + x.className));
    if (!c.length) { b.ev(start); continue; }
    try { c[Math.floor(Math.random() * c.length)].click(); } catch (e) { b.errors.push('click: ' + e.message); }
  }
}

(async () => {
  const html = fs.readFileSync(FILE, 'utf8');

  /* 1. sintaxis */
  { const p = []; const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    blocks.forEach((src, i) => { try { new vm.Script(src); } catch (e) { p.push('script ' + i + ': ' + e.message); } });
    report('Sintaxis de los scripts', p); }

  /* 2. arranque con estado vacío */
  const fresh = await ready(null);
  report('Arranca sin errores (usuario nuevo)', fresh.errors);

  /* 3. integridad del contenido */
  { const ev = fresh.ev; const p = [];
    const r = ev(`(function(){ var out=[];
      PHRASES.forEach(function(ph){ if(ph.parts && ph.parts.join('')!==ph.jp) out.push('frase con parts que no suman su jp: '+ph.jp); });
      var seen={}; PHRASES.forEach(function(ph){ if(seen[ph.jp]) out.push('frase duplicada: '+ph.jp); seen[ph.jp]=1; });
      PATTERNS.forEach(function(pa){ pa.needs.forEach(function(n){ if(!PATTERN_BY_ID[n]) out.push(pa.id+' necesita un patrón que no existe: '+n); }); });
      /* cada patrón tiene una frase armable el día que se enseña, en orden */
      var pt=ensurePatterns(), save=JSON.stringify(pt.seen), s={};
      PATTERNS.slice().sort(function(a,b){return a.order-b.order;}).forEach(function(pa){
        pa.needs.forEach(function(n){ if(!s[n]) out.push(pa.id+' (orden '+pa.order+') va antes de lo que necesita: '+n); });
        s[pa.id]=1; pt.seen=s;
        var ex=PHRASES.filter(function(ph){ return ph.parts && patternOf(ph)===pa.id; });
        if(ex.length && !ex.some(function(ph){ return buildableGate(ph); })) out.push(pa.id+': ninguna frase armable el día que se enseña'); });
      pt.seen=JSON.parse(save);
      /* taller: cada pieza antes de usarse, casillas correctas, los N5 adentro y con palabra */
      var tseen={}; TALLER.list.forEach(function(o){ o.parts.forEach(function(x){ if(!tseen[x]) out.push('taller: '+o.g+' usa '+x+' antes de enseñarlo'); }); tseen[o.g]=1;
        var sl=TALLER_SLOTS[o.lay]||['c']; if(o.parts.length && sl.length!==o.parts.length) out.push('taller: '+o.g+' tiene '+o.parts.length+' piezas para '+sl.length+' casillas'); });
      N5_KANJI.forEach(function(c){ if(!TALLER.by[c]) out.push('kanji N5 fuera del taller: '+c);
        if(!Object.keys(KANJI_WORDS).some(function(k){ return KANJI_WORDS[k].indexOf(c)>=0 && WORD_BY_JP[k]; })) out.push('kanji N5 sin palabra que lo enseñe: '+c); });
      Object.keys(KANJI_WORDS).forEach(function(k){ var f=KANJI_WORDS[k]; for(var i=0;i<f.length;i++){ var c=f.charAt(i); if(isKanjiChar(c) && !(c in KANJI_PARTS)) out.push('kanji sin entrada en KANJI_PARTS: '+c+' ('+f+')'); } });
      /* bancos de escucha, lectura y escenas */
      LISTEN_ITEMS.forEach(function(it){ if(!(it.a>=0 && it.a<it.opts.length)) out.push('escucha con respuesta inválida: '+it.id); });
      READ_ITEMS.concat(GAME_SCENES).forEach(function(it){ it.qs.forEach(function(q,i){ if(!(q.a>=0 && q.a<q.opts.length)) out.push('lectura con respuesta inválida: '+it.id+' #'+i); }); });
      var gids={}; GAMES.forEach(function(g){ gids[g.id]=1; }); GAME_SCENES.forEach(function(it){ it.games.forEach(function(g){ if(!gids[g]) out.push('escena para un juego que no existe: '+it.id+' -> '+g); }); });
      return out; })()`);
    report('Integridad del contenido (gramática, taller, kanji, bancos)', r); }

  /* 4. puente: opciones de lectura y escritura */
  { const r = fresh.ev(`(function(){ var out=[], ws=WORD_POOL.filter(function(w){ return kanjiForm(w); });
      ws.forEach(function(w){ ['bridgeReadOpts','bridgeWriteOpts'].forEach(function(fn){ var o=window.__ev(fn)(w), ok=o.filter(function(x){return x.ok;}).length, u={};
        o.forEach(function(x){ if(u[x.jp]) out.push(fn+' repite opción en '+w.jp+': '+x.jp); u[x.jp]=1; });
        if(ok!==1) out.push(fn+' sin exactamente una correcta: '+w.jp); if(o.length<2) out.push(fn+' con menos de 2 opciones: '+w.jp); }); });
      return out; })()`);
    report('Puente: cada pregunta tiene una sola correcta y opciones distintas', r); }

  /* 5. reglas del repaso espaciado */
  { const ev = fresh.ev; const p = [];
    ev(`ensureKana().box['a']=5; ensureKana().lastMove={}; srsMark('hira','a',false);`);
    if (ev(`ensureKana().box['a']`) !== 3) p.push('kana: un error desde la caja 5 debería dejarla en 3');
    ev(`ensureKana().box['i']=3; ensureKana().lastMove={}; srsMark('hira','i',true); srsMark('hira','i',true);`);
    if (ev(`ensureKana().box['i']`) !== 4) p.push('kana: de la caja 3 para arriba se sube una sola vez por día');
    ev(`ensureKana().box['u']=0; srsMark('hira','u',true); srsMark('hira','u',true);`);
    if (ev(`ensureKana().box['u']`) !== 2) p.push('kana: los primeros pasos (0 a 2) deben poder darse el mismo día');
    ev(`var k=ensureKanji(); k.rd['山']=0; delete k.rdDay['山']; bridgeCredit('山','rd',true); bridgeCredit('山','rd',true);`);
    if (ev(`ensureKanji().rd['山']`) !== 1) p.push('puente: un solo paso por día y dirección');
    /* palabras: lo dominado sale cuando le toca y lo que ya se movió hoy casi no sale */
    ev(`var _w=ensureWords(); rsess={pool:WORD_POOL,box:_w.box,ex:_w}; _w.lastMove=_w.lastMove||{};
      ['あさ','いぬ','ねこ'].forEach(function(j){ _w.box[j]=5; _w.lastMove[j]=today(); }); _w.box['やま']=1; _w.lastMove['やま']='2000-01-01';`);
    const picks = ev(`(function(){ var idx=['あさ','いぬ','ねこ','やま'].map(function(j){ return WORD_POOL.findIndex(function(w){return w.jp===j;}); }), c=0; for(var i=0;i<400;i++){ if(WORD_POOL[weightedPick(WORD_POOL,ensureWords().box,idx,[])].jp==='やま')c++; } return c; })()`);
    if (picks < 300) p.push('palabras: una palabra en aprendizaje debería salir mucho más que las dominadas y repasadas hoy (' + picks + '/400)');
    /* entrada adaptable: con buena precisión el tope se abre, con mala se cierra */
    ev(`var _w2=ensureWords(); _w2.acc={}; _w2.acc[today()]={n:40,c:38};`);
    if (!(ev('readLearnPool()') > 12)) p.push('entrada de palabras: con 95% de aciertos el tope debería abrirse');
    ev(`ensureWords().acc[today()]={n:40,c:24};`);
    if (!(ev('readLearnPool()') < 12)) p.push('entrada de palabras: con 60% de aciertos el tope debería cerrarse');
    report('Reglas del repaso (kana, kanji y palabras)', p); }

  /* audio: la partícula は suena wa y へ suena e, sin tocar lo que se ve */
  { const ev = fresh.ev; const p = [];
    const cases = [['がっこう|へ|いきます', 'がっこうえいきます'], ['わたし|は|がくせい|です', 'わたしわがくせいです']];
    cases.forEach(([parts, want]) => { const ph = ev(`(function(){ var pp=${JSON.stringify(parts)}.split('|'); return PHRASES.filter(function(x){ return x.parts&&x.parts.join('|')===pp.join('|'); })[0]||null; })()`);
      if (ph) { const got = ev('ttsText(' + JSON.stringify(ph.jp) + ')'); if (got !== want) p.push('audio de ' + ph.jp + ': ' + got); } });
    if (ev('ttsText("はは")') !== 'はは') p.push('audio: una palabra suelta no se toca (はは)');
    if (ev('ttsText("わたしは まいにち がっこうへ いきます。")') !== 'わたしわ まいにち がっこうえ いきます。') p.push('audio: partículas en textos con espacios');
    PHRASES_LEN_CHECK: { const bad = ev(`PHRASES.filter(function(x){ return ttsText(x.jp).length!==x.jp.length; }).map(function(x){return x.jp;}).slice(0,5).join(' ')`); if (bad) p.push('el audio cambia el largo (rompe el barrido): ' + bad); }
    report('Audio: partículas は y へ', p); }

  /* 6. guardado: el código de respaldo ida y vuelta y la migración idempotente */
  { const ev = fresh.ev; const p = [];
    ev(MID_STATE);
    const same = ev(`(function(){ var code=encodeState(state), back=decodeCode(code); var a=JSON.stringify(migrate(JSON.parse(JSON.stringify(state)))), b=JSON.stringify(migrate(back)); return a===b; })()`);
    if (!same) p.push('el respaldo NIKKA1 no vuelve igual al importarlo');
    const idem = ev(`(function(){ var s1=JSON.stringify(migrate(JSON.parse(JSON.stringify(state)))); var s2=JSON.stringify(migrate(JSON.parse(s1))); return s1===s2; })()`);
    if (!idem) p.push('migrate() cambia el estado si se corre dos veces');
    const mk = ev(`(function(){ var k=ensureKanji(); var a=JSON.stringify(k.rd); migrateKanjiBridge(); return a===JSON.stringify(k.rd); })()`);
    if (!mk) p.push('la migración del puente no es idempotente');
    ev(`state.lastBackup='2026-01-01';`);
    const lb = ev(`(function(){ var m=migrate(JSON.parse(JSON.stringify(state))); var g=mergeStates(m, emptyState()); return m.lastBackup+'|'+g.lastBackup; })()`);
    if (lb !== '2026-01-01|2026-01-01') p.push('lastBackup se pierde en migrate o mergeStates: ' + lb);
    report('Respaldo y migraciones', p); }

  /* 7. simulacro */
  { const r = fresh.ev(`(function(){ var out=[]; for(var t=0;t<5;t++){ var mq=mockBuild(); if(mq.length<35) out.push('simulacro con pocas preguntas: '+mq.length);
      mq.forEach(function(q,i){ var good=-1; if(q.k==='read') good=q.item.qs[q.qi].a; else if(q.k==='listen') good=q.item.a; else q.opts.forEach(function(o,j){ if(o.ok) good=j; });
        if(good<0 || !mockIsOk(q,good)) out.push('pregunta '+i+' ('+q.k+') sin respuesta correcta alcanzable');
        if(mockSer && !mockDe(JSON.parse(JSON.stringify(mockSer(q))))) out.push('pregunta '+i+' ('+q.k+') no se puede guardar y recuperar'); }); }
      return out; })()`);
    report('Simulacro: preguntas válidas y guardables', r); }

  /* 8. uso real simulado: clics al azar por toda la app con un usuario intermedio */
  { const b = await ready(null); b.ev(MID_STATE);
    await fuzz(b, 'startDaily()', 1500);
    await fuzz(b, 'startTaller()', 600);
    await fuzz(b, 'openPrepHub()', 800);
    await fuzz(b, '(setAim("__n5__"),startDaily(),0)', 800);
    await fuzz(b, '(customCfg={kanji:true,words:true,listen:true,read:true,phrases:true},startCustom(),0)', 600);
    report('Clics al azar en práctica diaria, taller, preparación N5 y ejercicio personalizado (4300)', b.errors); }

  /* 9. el kana no se cae: 8 días respondiendo bien el 90% */
  { const b = await ready(null); b.ev(MID_STATE); const p = [];
    b.ev(`activePairs().forEach(function(x){ boxFor(x.script)[x.romaji]=3; setDue(x.script,x.romaji,0); });`);
    const due0 = b.ev('dueCount()');
    for (let day = 0; day < 8; day++) { setDayOffset(b, day); b.ev('startDaily()');
      for (let n = 0; n < 300; n++) {
        if (b.ev('!!(sess&&sess.q&&!sess.q.answered&&sess.mode==="quiz"&&!document.getElementById("drill").classList.contains("hidden"))')) { const ok = Math.random() < 0.9; b.ev(b.ev('sess.q.dir') === 'type' ? (ok ? 'answerType(sess.q.target)' : 'answerType("xx")') : (ok ? 'answer(sess.q.target)' : 'answer("__")')); continue; }
        if (b.ev('!!(bsess&&bsess.q&&!bsess.q.done&&!document.getElementById("reading").classList.contains("hidden"))')) { const m = b.ev('bsess.q.mode');
          if (m === 'cloze') b.ev('buildAnswerCloze(bsess.q.tgt.romaji)'); else if (m === 'full') b.ev('buildTapTile(bsess.q.chars[bsess.q.slot].ch)'); else b.ev('buildAnswerType(bsess.q.chars.map(function(c){return c.romaji}).join(""))'); continue; }
        const ov = ['reading', 'drill', 'custom'].map(id => b.d.getElementById(id)).filter(e => e && !e.classList.contains('hidden'));
        let c = []; ov.forEach(o => c.push(...o.querySelectorAll('button:not([disabled])'))); c = c.filter(x => !/d-close|Close|gear|dPass|xPass|Story/.test(x.id + ' ' + x.className));
        if (!c.length) { b.ev('startDaily()'); continue; } c[Math.floor(Math.random() * c.length)].click(); } }
    const due1 = b.ev('dueCount()');
    if (due1 > due0) p.push('los kana vencidos crecieron de ' + due0 + ' a ' + due1 + ' en 8 días respondiendo bien');
    report('El kana se mantiene con práctica diaria', p.concat(b.errors)); }

  /* 10. opcional: un respaldo real */
  if (process.env.NIKKA_SAVE) {
    const raw = fs.readFileSync(process.env.NIKKA_SAVE, 'utf8').trim();
    const st = JSON.parse(Buffer.from(raw.replace(/^NIKKA1\./, ''), 'base64').toString('utf8'));
    const b = await ready(st); await fuzz(b, 'startDaily()', 1500); await fuzz(b, 'openPrepHub()', 600);
    report('Respaldo real (NIKKA_SAVE): arranque y 2100 clics', b.errors);
  }

  console.log(failures ? '\n' + failures + ' falla(s)' : '\nTodo en orden');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
