/* Miss Minutes AI - browser application */
const $ = (id) => document.getElementById(id);
const messages = $('messages');

let voiceReplies = true;
let recognition = null;
let isSending = false;

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn(`Could not read ${key} from local storage.`, error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Could not save ${key} to local storage.`, error);
    return false;
  }
}

let reminders = readStorage('mm_reminders', []);
if (!Array.isArray(reminders)) reminders = [];
let settings = readStorage('mm_settings', { name: 'Miss Minutes', language: 'en-IN' });
if (!settings || typeof settings !== 'object') settings = { name: 'Miss Minutes', language: 'en-IN' };
settings.name = typeof settings.name === 'string' && settings.name.trim() ? settings.name : 'Miss Minutes';
settings.language = typeof settings.language === 'string' ? settings.language : 'en-IN';

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function updateClock() {
  const now = new Date();
  setText('liveTime', now.toLocaleTimeString('en-IN', { hour12: true }));
  setText('liveDate', now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }));
}
updateClock();
setInterval(updateClock, 1000);

function addMessage(text, who = 'assistant') {
  if (!messages) return;
  const safeText = typeof text === 'string' && text.trim() ? text : 'I could not create a response.';
  const row = document.createElement('div');
  row.className = `message ${who}`;

  if (who === 'assistant') {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = '◷';
    row.append(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const name = document.createElement('b');
  name.textContent = who === 'assistant' ? settings.name : 'You';
  const paragraph = document.createElement('p');
  paragraph.textContent = safeText;
  bubble.append(name, paragraph);
  row.append(bubble);
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
}

function speak(text) {
  if (!voiceReplies || !('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = settings.language;
  utterance.rate = 0.96;
  window.speechSynthesis.speak(utterance);
}

function localAnswer(text) {
  const value = text.toLowerCase();
  if (value.includes('time') || value.includes('date')) {
    return `It's ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}. Time certainly does fly!`;
  }
  if (value.includes('hello') || value === 'hi' || value.startsWith('hi ')) {
    return 'Well, hello there! Lovely to see you. What can I help you with today?';
  }
  if (value.includes('remind')) {
    return 'You can add a reminder in the Reminder Desk. Choose its date and time there.';
  }
  if (value.includes('plan my day')) {
    return 'Let’s make a simple plan: choose your top priority, add two smaller tasks, schedule breaks, and review your progress this evening.';
  }
  return null;
}

async function ask(text) {
  const input = $('chatInput');
  const prompt = typeof text === 'string' ? text.trim() : '';
  if (!prompt || isSending) return;

  addMessage(prompt, 'user');
  if (input) input.value = '';
  isSending = true;
  const sendButton = $('sendBtn');
  if (sendButton) sendButton.disabled = true;
  setText('mascotMood', 'THINKING…');
  let answer = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ message: prompt })
    });

    let data = {};
    try { data = await response.json(); } catch (_) { /* non-JSON response */ }

    if (!response.ok) {
      const detail = typeof data.error === 'string' ? data.error : 'The assistant service rejected the request.';
      throw new Error(`AI service error (${response.status}): ${detail}`);
    }

    if (typeof data.reply !== 'string' || !data.reply.trim()) {
      throw new Error('The AI service returned an empty reply. Please try again.');
    }
    answer = data.reply.trim();
  } catch (error) {
    console.error('Miss Minutes chat request failed:', error);
    const local = localAnswer(prompt);
    answer = local || (error instanceof TypeError
      ? 'I could not reach the AI service. Please check your internet connection and try again.'
      : `${error.message || 'The AI service is temporarily unavailable.'} Please try again in a moment.`);
  } finally {
    isSending = false;
    if (sendButton) sendButton.disabled = false;
    setText('mascotMood', 'READY TO HELP');
  }

  addMessage(answer);
  speak(answer);
  const memoryToggle = $('memoryToggle');
  if (memoryToggle && memoryToggle.checked) saveMemory(prompt, answer);
}

if ($('sendBtn')) $('sendBtn').addEventListener('click', () => ask($('chatInput')?.value || ''));
if ($('chatInput')) $('chatInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    ask(event.currentTarget.value);
  }
});
document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => ask(button.dataset.prompt || ''));
});

if ($('speakToggle')) $('speakToggle').addEventListener('click', () => {
  voiceReplies = !voiceReplies;
  $('speakToggle').textContent = `🔊 Voice replies: ${voiceReplies ? 'ON' : 'OFF'}`;
  if (!voiceReplies && 'speechSynthesis' in window) window.speechSynthesis.cancel();
});

if ($('micBtn')) $('micBtn').addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setText('voiceStatus', 'Speech recognition is not supported in this browser. Try Chrome.');
    return;
  }
  if (recognition) {
    recognition.stop();
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = settings.language;
  recognition.interimResults = false;
  recognition.onstart = () => setText('voiceStatus', 'Listening… speak now.');
  recognition.onresult = (event) => {
    const heard = event.results?.[0]?.[0]?.transcript || '';
    if ($('chatInput')) $('chatInput').value = heard;
    ask(heard);
  };
  recognition.onerror = () => setText('voiceStatus', 'Microphone unavailable or permission denied.');
  recognition.onend = () => {
    setText('voiceStatus', 'Voice input ready.');
    recognition = null;
  };
  try { recognition.start(); }
  catch (error) {
    console.warn('Could not start speech recognition:', error);
    recognition = null;
    setText('voiceStatus', 'Could not start the microphone. Please try again.');
  }
});

const appUrls = {
  whatsapp: 'https://wa.me/',
  youtube: 'https://www.youtube.com/',
  instagram: 'https://www.instagram.com/',
  gmail: 'https://mail.google.com/',
  maps: 'https://maps.google.com/',
  github: 'https://github.com/'
};
document.querySelectorAll('[data-app]').forEach((button) => {
  button.addEventListener('click', () => {
    const url = appUrls[button.dataset.app];
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  });
});

if ($('searchForm')) $('searchForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const query = $('searchInput')?.value.trim();
  if (query) window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
});

function saveReminders() {
  writeStorage('mm_reminders', reminders);
  renderReminders();
}

function renderReminders() {
  const list = $('reminderList');
  if (!list) return;
  list.replaceChildren();
  if (!reminders.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No reminders yet.';
    list.append(empty);
    return;
  }

  reminders.sort((a, b) => Number(a.time) - Number(b.time)).forEach((reminder) => {
    const item = document.createElement('div');
    item.className = 'reminder-item';
    const info = document.createElement('div');
    info.textContent = reminder.text;
    const date = document.createElement('small');
    date.textContent = new Date(reminder.time).toLocaleString();
    info.append(date);
    const remove = document.createElement('button');
    remove.className = 'remove-reminder';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Delete reminder');
    remove.addEventListener('click', () => {
      reminders = reminders.filter((itemToKeep) => itemToKeep.id !== reminder.id);
      saveReminders();
    });
    item.append(info, remove);
    list.append(item);
  });
}

if ($('reminderForm')) $('reminderForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('reminderText')?.value.trim() || '';
  const time = new Date($('reminderTime')?.value || '').getTime();
  if (!text || !Number.isFinite(time) || time <= Date.now()) {
    alert('Choose a reminder and a future date and time.');
    return;
  }
  reminders.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, time, notified: false });
  saveReminders();
  event.currentTarget.reset();
});

function checkReminders() {
  let changed = false;
  for (const reminder of reminders) {
    if (!reminder.notified && Number(reminder.time) <= Date.now()) {
      reminder.notified = true;
      changed = true;
      addMessage(`Reminder: ${reminder.text}`);
      speak(`A little reminder: ${reminder.text}`);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Miss Minutes reminder', { body: reminder.text });
      } else {
        alert(`Miss Minutes reminder: ${reminder.text}`);
      }
    }
  }
  if (changed) saveReminders();
}
renderReminders();
setInterval(checkReminders, 15000);
if ($('reminderForm') && 'Notification' in window && Notification.permission === 'default') {
  $('reminderForm').addEventListener('focusin', () => Notification.requestPermission(), { once: true });
}

function saveMemory(user, assistant) {
  const items = readStorage('mm_memory', []);
  const safeItems = Array.isArray(items) ? items : [];
  safeItems.push({ date: new Date().toISOString(), user, assistant });
  writeStorage('mm_memory', safeItems.slice(-50));
}

if ($('memoryToggle')) {
  $('memoryToggle').checked = localStorage.getItem('mm_memory_enabled') === 'true';
  $('memoryToggle').addEventListener('change', () => {
    localStorage.setItem('mm_memory_enabled', $('memoryToggle').checked ? 'true' : 'false');
    if (!$('memoryToggle').checked && $('memoryArea')) {
      $('memoryArea').textContent = 'Memory is off. Previously saved items remain until you clear them.';
    }
  });
}

if ($('viewMemory')) $('viewMemory').addEventListener('click', () => {
  const area = $('memoryArea');
  if (!area) return;
  area.hidden = false;
  const data = readStorage('mm_memory', []);
  area.textContent = Array.isArray(data) && data.length
    ? data.map((item) => `${new Date(item.date).toLocaleString()}\nYou: ${item.user}\n${settings.name}: ${item.assistant}`).join('\n\n')
    : 'No saved memory.';
});

if ($('clearMemory')) $('clearMemory').addEventListener('click', () => {
  if (confirm('Permanently clear this browser’s saved Miss Minutes memory?')) {
    localStorage.removeItem('mm_memory');
    setText('memoryArea', 'Saved memory cleared.');
  }
});

if ($('settingsBtn') && $('settingsDialog')) {
  $('settingsBtn').addEventListener('click', () => $('settingsDialog').showModal());
}
if ($('assistantName')) $('assistantName').value = settings.name;
if ($('voiceLanguage')) $('voiceLanguage').value = settings.language;
if ($('saveSettings')) $('saveSettings').addEventListener('click', () => {
  settings = {
    name: $('assistantName')?.value.trim() || 'Miss Minutes',
    language: $('voiceLanguage')?.value || 'en-IN'
  };
  writeStorage('mm_settings', settings);
  if ($('settingsDialog')?.open) $('settingsDialog').close();
});
                    
