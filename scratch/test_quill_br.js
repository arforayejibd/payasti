const fs = require('fs');
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  console.log('jsdom not installed');
  process.exit(0);
}

const quillCode = fs.readFileSync('public/vendor/quill/quill.min.js', 'utf8');

const htmlInput = '<p>আমার গাঁয়ে ডিঙি নায়ে<br />আসতে তুমি যদি,<br />দেখতে নদী কলকলিয়ে<br />বইছে নিরবধি।</p>';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor">' + htmlInput + '</div></body></html>', {
  runScripts: 'dangerously',
  resources: 'usable'
});

const window = dom.window;
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.HTMLDivElement = window.HTMLDivElement;
global.Node = window.Node;

const script = window.document.createElement('script');
script.textContent = quillCode;
window.document.head.appendChild(script);

const Quill = window.Quill;
if (!Quill) {
  console.log('Quill not defined on window');
  process.exit(0);
}

const quill = new Quill('#editor');
console.log('Original input:\n', htmlInput);
console.log('\nQuill parsed output:\n', quill.root.innerHTML);
