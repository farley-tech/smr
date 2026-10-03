const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const cases = [
  ['?lat=40.2&lng=-74.3', false, 'https://www.google.com', '40.2,-74.3'],
  ['?lat=40.2&lng=-74.3', true, 'https://maps.apple.com', '40.2,-74.3'],
  ['?lat=0&lng=0', false, 'https://www.google.com', '0,0'],
  ['?lat=-90&lng=180', true, 'https://maps.apple.com', '-90,180'],
  ['?addr=12%20Main%20St%20%26%20Park', false, 'https://www.google.com', '12 Main St & Park'],
  ['?addr=12%20Main%20St', true, 'https://maps.apple.com', '12 Main St'],
  ['?lat=91&lng=0&addr=Fallback', false, 'https://www.google.com', 'Fallback'],
  ['?lat=0&lng=-181&addr=Fallback', true, 'https://maps.apple.com', 'Fallback'],
  ['?lat=NaN&lng=0', false, 'https://www.google.com', null],
  ['?lat=%20&lng=0', false, 'https://www.google.com', null],
  ['?lat=40%26mode%3Dwalking&lng=-74&addr=Fallback', false, 'https://www.google.com', 'Fallback'],
  ['', true, 'https://www.google.com', null],
];
let passed = 0;
for (const file of ['index.html', 'nav-redirect.html']) {
 const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
 const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
 for (const [search, ios, origin, destination] of cases) {
   const fallback = {};
   let redirect;
   vm.runInNewContext(script, {
     URLSearchParams, encodeURIComponent, Number,
     location: {search, replace(value) {redirect = value;}},
     navigator: {userAgent: ios ? 'iPhone' : 'Android', platform: '', maxTouchPoints: 0},
     document: {getElementById() {return fallback;}},
   });
   const url = new URL(redirect);
   assert.equal(url.origin, origin, file + search);
   assert.equal(url.searchParams.get(ios && destination !== null ? 'daddr' : 'destination'), destination, file + search);
   assert.equal(fallback.href, redirect);
   assert.equal(url.searchParams.has('mode'), false);
   passed++;
 }
}
assert.equal(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), fs.readFileSync(path.join(__dirname, 'nav-redirect.html'), 'utf8'));
console.log(passed + ' offline redirect cases passed; both pages identical');
