const search = document.getElementById('dirSearch');
const regions = [...document.querySelectorAll('.dir-region')];

function filterDirectory() {
  const q = (search?.value || '').trim().toLowerCase();
  for (const block of regions) {
    let visible = 0;
    for (const item of block.querySelectorAll('li')) {
      const text = item.textContent.toLowerCase();
      const show = !q || text.includes(q);
      item.hidden = !show;
      if (show) visible += 1;
    }
    block.hidden = visible === 0;
  }
}

search?.addEventListener('input', filterDirectory);
