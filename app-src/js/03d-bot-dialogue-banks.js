/* ---- Bot dialogue phrase banks (templated, slot-filled — no LLM) ---- */
const DIALOGUE_BANKS = {
  scene_enter: [
    { text: '{name} glances around the room, taking stock of the exits.' },
    { text: '{name} mutters, "Let\'s not linger here longer than we have to."', temperaments: ['anxious', 'gruff'] },
    { text: '{name} grins. "New place, new trouble — I love it already."', temperaments: ['cheerful'] },
    { text: '{name} says nothing, but their hand rests near their weapon.', temperaments: ['stoic'] },
    { text: '{name} raises an eyebrow. "Well, this looks promising. Or cursed. Hard to tell these days."', temperaments: ['sarcastic'] }
  ],
  low_hp: [
    { text: '{name} grits their teeth. "I\'ve had worse. Probably."', temperaments: ['gruff', 'stoic'] },
    { text: '{name} stumbles, breathing hard. "I— I\'m still standing. Just... give me a second."', temperaments: ['anxious'] },
    { text: '{name} laughs shakily. "Okay, that one\'s going to leave a mark."', temperaments: ['cheerful', 'sarcastic'] },
    { text: '{name} presses a hand to their side, jaw set, saying nothing.' }
  ],
  command_focus: [
    { text: '{name} nods sharply. "Focusing {target}."' },
    { text: '{name} eyes {target}. "On it."', temperaments: ['stoic', 'gruff'] },
    { text: '{name} grins. "{target} won\'t know what hit them."', temperaments: ['cheerful'] }
  ],
  command_hold: [
    { text: '{name} plants their feet and holds position.' },
    { text: '{name} nods and waits, watching the group\'s flank.' }
  ],
  command_flee: [
    { text: '{name} doesn\'t need to be told twice — already moving.' },
    { text: '{name} grimaces. "Retreating. Not proud of it, but retreating."', temperaments: ['sarcastic', 'idealistic'] }
  ],
  command_use_item: [
    { text: '{name} digs through their pack. "Using {target}."' }
  ]
};
function botDisplayNameFor(char) { return char ? char.name : 'A party member'; }

async function postBotDialogue(campaignId, bot, char, trigger, slots) {
  const bank = (bot.phraseBankOverrides && bot.phraseBankOverrides[trigger]) || DIALOGUE_BANKS[trigger];
  if (!bank || !bank.length) return null;
  const text = pickDialogueLine(bank, bot.temperament, { name: botDisplayNameFor(char), ...(slots || {}) });
  if (!text) return null;
  const entry = makeLogEntry({ campaignId, type: 'dialogue', speakerType: 'bot', speakerId: char.id, text });
  await DB.put('log_entries', entry);
  return entry;
}
