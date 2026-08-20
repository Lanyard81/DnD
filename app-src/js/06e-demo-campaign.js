/* ---- Demo campaign (fully seeded, one-tap "try it now") ---- */
async function createDemoCampaign() {
  const campaign = makeCampaign({
    name: 'The Lantern Road — Demo', description: SAMPLE_ADVENTURES[0].premise,
    rulesProfile: 'legacy', automationLevel: 'medium', aiDmEnabled: true, theme: getActiveTheme(), playMode: 'solo_party'
  });
  await DB.put('campaigns', campaign);

  // Curated, fixed pregen party — deterministic on purpose, unlike the
  // random "Fill Party with Bots" generator, so the demo is the same every time.
  const player = buildCharacterFromPregen(PREGEN_CHARACTERS[0], campaign.id, 'player');
  await DB.put('characters', player);

  const botConfigs = [
    { pregenIndex: 1, temperament: 'cheerful', speakingStyle: 'Warm and talkative', combatStyle: 'moderate' },
    { pregenIndex: 2, temperament: 'sarcastic', speakingStyle: 'Dry and sarcastic', combatStyle: 'advanced' },
    { pregenIndex: 3, temperament: 'stoic', speakingStyle: 'Soft-spoken', combatStyle: 'moderate' }
  ];
  for (const cfg of botConfigs) {
    const char = buildCharacterFromPregen(PREGEN_CHARACTERS[cfg.pregenIndex], campaign.id, 'bot');
    await DB.put('characters', char);
    const bot = makeBotProfile({
      campaignId: campaign.id, characterId: char.id,
      personality: { temperament: cfg.temperament, speakingStyle: cfg.speakingStyle, quirks: [pick(BOT_QUIRKS)], goals: [pick(BOT_GOALS)], fears: [pick(BOT_FEARS)], bonds: [pick(BOT_BONDS)], combatStyle: cfg.combatStyle }
    });
    await DB.put('bots', bot);
  }

  await loadSampleAdventure(campaign.id, 'tutorial');
  return campaign;
}
