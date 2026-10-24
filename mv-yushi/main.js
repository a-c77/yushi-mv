// Page entry. Optional ?from=&to= renders a slice of the song — useful on a CPU-only
// machine: render 70–112 s first, check it, then render the rest.
const q = new URLSearchParams(location.search);
const mod = await import('./film.js');
const draw = await mod.setup(document.getElementById('c'));

const from = +(q.get('from') ?? 0), to = +(q.get('to') ?? 0);
if (to > from) {
  window.DUR = to - from;
  window.render = t => draw(t + from);
} else {
  window.render = t => draw(t);
}
render(0);
window.READY = true;
