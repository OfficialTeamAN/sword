const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost/' });

let js = fs.readFileSync('main.js', 'utf8');
js = js.replace(/import \* as THREE from 'three';/g, 'const THREE = { Vector3: class {}, DataTexture: class {}, MeshToonMaterial: class {}, MeshBasicMaterial: class {}, WebGLRenderer: class { constructor() {} } };');

const script = new dom.window.document.defaultView.Function('window', 'document', 'matchMedia', 'IntersectionObserver', 'fetch', 'requestAnimationFrame', 'setTimeout', 'setInterval', 'Date', 'Math', 'String', 'Array', js);

try {
  script(
    dom.window, 
    dom.window.document, 
    () => ({ matches: false }),
    class { observe(){} unobserve(){} },
    async () => ({ ok: false }),
    (cb) => setTimeout(cb, 16),
    setTimeout, 
    setInterval, 
    Date, Math, String, Array
  );
  console.log('Successfully executed main.js in mocked JSDOM!');
} catch (e) {
  console.error('ERROR IN MAIN.JS:', e);
}
