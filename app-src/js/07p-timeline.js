/* ---- Timeline (chronological view of campaign memory events) ---- */
async function ScreenTimeline(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  const mem = await getOrCreateCampaignMemory(campaignId);
  const events = mem.recentEventsRingBuffer.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  root.innerHTML = `
    <p class="hint">A running record of notable campaign events, oldest first — fed automatically by the scripted DM and bot party as play happens.</p>
    ${events.length ? events.map(e => `
      <div class="card">
        <p class="hint" style="margin:0 0 .2rem">${new Date(e.createdAt).toLocaleString()}</p>
        <p style="margin:0">${escapeHtml(e.text)}</p>
      </div>
    `).join('') : emptyState('🕰', 'No events recorded yet', 'Play a session — narrate scenes, issue party commands, run combat — and they will appear here.')}
  `;
}
