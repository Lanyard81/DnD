/* ---------- 5. ROUTER / APP SHELL ---------- */
const Router = {
  route: { name: 'landing', params: {} },
  parse() {
    const hash = location.hash.replace(/^#\/?/, '');
    const parts = hash.split('/').filter(Boolean);
    if (parts.length === 0) return { name: 'landing', params: {} };
    if (parts[0] === 'campaigns' && parts.length === 1) return { name: 'campaignList', params: {} };
    if (parts[0] === 'campaigns' && parts[1] && parts.length === 2) return { name: 'campaignDetail', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'characters' && parts[3] === 'new') return { name: 'characterNew', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'characters' && parts[3]) return { name: 'characterSheet', params: { campaignId: parts[1], characterId: parts[3] } };
    if (parts[0] === 'campaigns' && parts[2] === 'table') return { name: 'table', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'bots') return { name: 'botSettings', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'encounters' && parts[3] === 'new') return { name: 'encounterNew', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'encounters' && parts[3]) return { name: 'combat', params: { campaignId: parts[1], encounterId: parts[3] } };
    if (parts[0] === 'campaigns' && parts[2] === 'maps' && parts.length === 3) return { name: 'mapList', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'maps' && parts[3]) return { name: 'mapView', params: { campaignId: parts[1], mapId: parts[3] } };
    if (parts[0] === 'campaigns' && parts[2] === 'library') return { name: 'library', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'dm') return { name: 'dmDashboard', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'npcs') return { name: 'npcManager', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'quests') return { name: 'questTracker', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'journal') return { name: 'journalLore', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'handouts') return { name: 'handouts', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'xp') return { name: 'xpLoot', params: { campaignId: parts[1] } };
    if (parts[0] === 'campaigns' && parts[2] === 'timeline') return { name: 'timeline', params: { campaignId: parts[1] } };
    if (parts[0] === 'settings') return { name: 'settings', params: {} };
    return { name: 'landing', params: {} };
  },
  go(hash) { location.hash = hash; },
  async render() {
    this.route = this.parse();
    const app = document.getElementById('app');
    app.innerHTML = shellHtml(this.route);
    wireBottomNav(this.route);
    const main = document.getElementById('screenRoot');
    try {
      switch (this.route.name) {
        case 'landing': await ScreenLanding(main); break;
        case 'campaignList': await ScreenCampaignList(main); break;
        case 'campaignDetail': await ScreenCampaignDetail(main, this.route.params.campaignId); break;
        case 'characterNew': await ScreenCharacterWizard(main, this.route.params.campaignId); break;
        case 'characterSheet': await ScreenCharacterSheet(main, this.route.params.campaignId, this.route.params.characterId); break;
        case 'table': await ScreenTable(main, this.route.params.campaignId); break;
        case 'botSettings': await ScreenBotSettings(main, this.route.params.campaignId); break;
        case 'encounterNew': await ScreenEncounterBuilder(main, this.route.params.campaignId); break;
        case 'combat': await ScreenCombat(main, this.route.params.campaignId, this.route.params.encounterId); break;
        case 'mapList': await ScreenMapList(main, this.route.params.campaignId); break;
        case 'mapView': await ScreenMapView(main, this.route.params.campaignId, this.route.params.mapId); break;
        case 'library': await ScreenHomebrewLibrary(main, this.route.params.campaignId); break;
        case 'dmDashboard': await ScreenDmDashboard(main, this.route.params.campaignId); break;
        case 'npcManager': await ScreenNpcManager(main, this.route.params.campaignId); break;
        case 'questTracker': await ScreenQuestTracker(main, this.route.params.campaignId); break;
        case 'journalLore': await ScreenJournalLore(main, this.route.params.campaignId); break;
        case 'handouts': await ScreenHandouts(main, this.route.params.campaignId); break;
        case 'xpLoot': await ScreenXpLoot(main, this.route.params.campaignId); break;
        case 'timeline': await ScreenTimeline(main, this.route.params.campaignId); break;
        case 'settings': await ScreenSettings(main); break;
        default: main.innerHTML = emptyState('❓', 'Unknown screen');
      }
    } catch (err) {
      console.error(err);
      main.innerHTML = errorState(err);
    }
  }
};

function shellHtml(route) {
  const titles = { landing: 'FableTable Solo', campaignList: 'Campaigns', campaignDetail: 'Campaign', characterNew: 'New Character', characterSheet: 'Character Sheet', table: 'Table', botSettings: 'Bot Settings', encounterNew: 'New Encounter', combat: 'Combat', mapList: 'Maps', mapView: 'Map', library: 'Homebrew Library', dmDashboard: 'DM Dashboard', npcManager: 'NPC Manager', questTracker: 'Quest Tracker', journalLore: 'Journal & Lore', handouts: 'Handouts', xpLoot: 'XP & Loot', timeline: 'Timeline', settings: 'Settings' };
  const showBack = route.name !== 'landing' && route.name !== 'campaignList';
  return `
    <header class="topbar">
      ${showBack ? `<button class="icon-btn" id="navBack" aria-label="Back">←</button>` : `<span class="app-icon">🎲</span>`}
      <h1>${escapeHtml(titles[route.name] || 'FableTable Solo')}</h1>
      <button class="icon-btn" id="navSettings" aria-label="Settings">⚙</button>
    </header>
    <main class="screen fadeUp" id="screenRoot"></main>
    <nav class="bottomnav">
      <button data-nav="landing"><span class="ico">🏠</span>Home</button>
      <button data-nav="campaignList"><span class="ico">📜</span>Campaigns</button>
      <button data-nav="settings"><span class="ico">⚙</span>Settings</button>
    </nav>
  `;
}

function wireBottomNav(route) {
  document.querySelectorAll('nav.bottomnav button').forEach(btn => {
    const target = btn.getAttribute('data-nav');
    btn.classList.toggle('active', target === route.name || (target === 'campaignList' && route.name === 'campaignDetail'));
    btn.onclick = () => Router.go(target === 'landing' ? '#/' : target === 'campaignList' ? '#/campaigns' : '#/settings');
  });
  const back = document.getElementById('navBack');
  if (back) back.onclick = () => history.back();
  const settingsBtn = document.getElementById('navSettings');
  if (settingsBtn) settingsBtn.onclick = () => Router.go('#/settings');
}

function emptyState(icon, text, sub) {
  return `<div class="empty-state"><div class="big-ico">${icon}</div><p>${escapeHtml(text)}</p>${sub ? `<p class="hint">${escapeHtml(sub)}</p>` : ''}</div>`;
}
function errorState(err) {
  return `<div class="empty-state"><div class="big-ico">⚠️</div><p>Something went wrong loading this screen.</p><p class="hint">${escapeHtml(err && err.message ? err.message : String(err))}</p></div>`;
}
function disclaimerFooter() {
  return `<p class="disclaimer-footer">FableTable Solo is an independent, unofficial fan-made project. Not affiliated with, endorsed by, or sponsored by Wizards of the Coast.</p>`;
}
