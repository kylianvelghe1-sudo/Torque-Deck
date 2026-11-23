/* ---------- Démarrage ---------- */
$('#shopPack').innerHTML = packHTML(false);
renderOdds();

async function boot(){
  try { PHOTOS = (await api('GET', '/api/photos')).photos || {}; } catch(e){ /* sans photos */ }
  try { applySession(await api('GET', '/api/me')); } catch(e){ ME = null; }
  setAuthMode('login');
  route();
  setInterval(updateTimer, 1000);
  // Mise à jour discrète toutes les 30 s (nouveaux paquets, propositions reçues)
  setInterval(async () => {
    if(!ME || stageOpen || document.hidden) return;
    await refresh();
    const v = currentView();
    if(v === 'boutique') renderShop();
  }, 30000);
  document.addEventListener('visibilitychange', async () => {
    if(document.hidden || !ME || stageOpen) return;
    await refresh();
    if(currentView() === 'boutique') renderShop();
  });
}
boot();
