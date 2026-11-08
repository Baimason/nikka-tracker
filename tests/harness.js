/* Arranca index.html en jsdom (un navegador simulado) con lo mínimo que la app pide
   del navegador: almacenamiento, audio y medidas de pantalla falsas. Expone ev(código)
   para ejecutar JavaScript DENTRO de la app y leer su estado interno. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = process.env.NIKKA_HTML || path.join(__dirname, '..', 'index.html');
const MARKER = '  })();\n})();';

function boot(stateObj) {
  let html = fs.readFileSync(FILE, 'utf8');
  if (html.split(MARKER).length !== 2) throw new Error('No encuentro el cierre del IIFE para inyectar la sonda');
  html = html.replace(MARKER, '  window.__ev=function(c){return eval(c);};\n' + MARKER);
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://nikka.test/',
    beforeParse(w) {
      const store = {};
      if (stateObj) store['nikka-tracker:v1'] = JSON.stringify(stateObj);
      Object.defineProperty(w, 'localStorage', { value: {
        getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } });
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [], addEventListener() {} };
      w.SpeechSynthesisUtterance = function () {};
      w.addEventListener('error', e => errors.push(String((e.error && e.error.stack) || e.message)));
    }
  });
  dom.window.console.error = (...a) => errors.push(a.join(' '));
  return { dom, w: dom.window, d: dom.window.document, ev: c => dom.window.__ev(c), errors };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function ready(stateObj) { const b = boot(stateObj); await sleep(700); return b; }

/* Avanza el reloj de la app N días (today() devuelve otra fecha) */
function setDayOffset(b, n) {
  b.ev(`if(!window.__t0){ window.__t0=today; today=function(){ var x=new Date(Date.parse(window.__t0()+'T12:00:00')+(window.__d||0)*86400000); return x.toISOString().slice(0,10); }; } window.__d=${n};`);
}
module.exports = { boot, ready, sleep, setDayOffset, FILE };
