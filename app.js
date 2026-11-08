
/* MISS MINUTES AI - OFFLINE ASSISTANT */

const $ = (id) => document.getElementById(id);
const messages = $('messages');

let voiceReplies = true;
let recognition = null;
let isSending = false;

/* STORAGE */

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

let reminders = readStorage('mm_reminders', []);
if (!Array.isArray(reminders)) reminders = [];

let settings = readStorage('mm_settings', {
  name: 'Miss Minutes',
  language: 'en-IN'
});

if (!settings || typeof settings !== 'object') {
  settings = { name: 'Miss Minutes', language: 'en-IN' };
}

/* CLOCK */

function updateClock() {
  const now = new Date();

  if ($('liveTime')) {
    $('liveTime').textContent =
      now.toLocaleTimeString('en-IN');
  }

  if ($('liveDate')) {
    $('liveDate').textContent =
      now.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
  }
}

updateClock();
setInterval(updateClock, 1000);

/* CHAT DISPLAY */

function addMessage(text, who = 'assistant') {
  if (!messages) return;

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
  name.textContent =
    who === 'assistant' ? settings.name : 'You';

  const paragraph = document.createElement('p');
  paragraph.textContent = text;

  bubble.append(name, paragraph);
  row.append(bubble);
  messages.append(row);

  messages.scrollTop = messages.scrollHeight;
}

/* VOICE REPLY */

function speak(text) {
  if (!voiceReplies) return;
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = settings.language || 'en-IN';
  speech.rate = 0.96;

  window.speechSynthesis.speak(speech);
}

/* CALCULATOR */

function calculate(text) {
  const match = text.match(
    /(-?\d+(?:\.\d+)?)\s*(\+|-|\*|\/|×|÷)\s*(-?\d+(?:\.\d+)?)/
  );

  if (!match) return null;

  const a = Number(match[1]);
  const operator = match[2];
  const b = Number(match[3]);

  let result;

  switch (operator) {
    case '+':
      result = a + b;
      break;

    case '-':
      result = a - b;
      break;

    case '*':
    case '×':
      result = a * b;
      break;

    case '/':
    case '÷':
      if (b === 0) return 'Division by zero is not possible.';
      result = a / b;
      break;

    default:
      return null;
  }

  return `${a} ${operator} ${b} = ${result}`;
}

/* OFFLINE ASSISTANT BRAIN */

function localAnswer(text) {
  const value = text.toLowerCase().trim();

  const calculation = calculate(text);

  if (calculation) return calculation;

  if (
    value.includes('multiply') ||
    value.includes('add') ||
    value.includes('subtract')
  ) {
    const numbers = value.match(/-?\d+(?:\.\d+)?/g);

    if (numbers && numbers.length >= 2) {
      const a = Number(numbers[0]);
      const b = Number(numbers[1]);

      if (value.includes('multiply')) return `${a} × ${b} = ${a * b}`;
      if (value.includes('add')) return `${a} + ${b} = ${a + b}`;
      if (value.includes('subtract')) return `${a} - ${b} = ${a - b}`;
    }
  }

  if (/^(hi|hello|hey)\b/.test(value)) {
    return 'Well, hello there! I am Miss Minutes, your personal offline assistant. How may I help you?';
  }

  if (value.includes('your name') || value.includes('who are you')) {
    return 'I am Miss Minutes, your personal clock-themed assistant!';
  }

  if (value.includes('time')) {
    return `The current time is ${new Date().toLocaleTimeString()}.`;
  }

  if (value.includes('date') || value.includes('today')) {
    return `Today is ${new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })}.`;
  }

  if (value.includes('remind')) {
    return 'You can create reminders using the Reminder Desk. Select a date and time to schedule one.';
  }

  if (value.includes('plan my day')) {
    return 'Here is a simple plan: choose your main priority, complete two smaller tasks, take regular breaks and review your progress in the evening.';
  }

  if (value.includes('thank')) {
    return 'You are very welcome! I am always ready to help.';
  }

  if (value.includes('help') || value.includes('what can you do')) {
    return `I can help with:
    
1. Basic calculations
2. Current time and date
3. Simple daily planning
4. Reminders
5. Opening supported websites
6. Voice input and spoken replies

I am currently running in offline mode.`;
  }

  if (value.includes('good morning')) {
    return 'Good morning! A fresh day and a fresh timeline. What is your plan today?';
  }

  if (value.includes('good night')) {
    return 'Good night! Have a peaceful rest.';
  }

  if (value.includes('open youtube')) {
    window.open('https://www.youtube.com/', '_blank');
    return 'Opening YouTube.';
  }

  if (value.includes('open google')) {
    window.open('https://www.google.com/', '_blank');
    return 'Opening Google.';
  }

  if (value.includes('open whatsapp')) {
    window.open('https://wa.me/', '_blank');
    return 'Opening WhatsApp.';
  }

  if (value.includes('open instagram')) {
    window.open('https://www.instagram.com/', '_blank');
    return 'Opening Instagram.';
  }

  return 'I am currently operating in offline mode. I can help with calculations, time, date, reminders and supported commands. Full AI conversations require an online AI service.';
}

/* MAIN CHAT FUNCTION */

async function ask(text) {
  const input = $('chatInput');
  const prompt = typeof text === 'string' ? text.trim() : '';

  if (!prompt || isSending) return;

  addMessage(prompt, 'user');

  if (input) input.value = '';

  isSending = true;

  const sendButton = $('sendBtn');

  if (sendButton) sendButton.disabled = true;

  if ($('mascotMood')) {
    $('mascotMood').textContent = 'THINKING…';
  }

  let answer;

  try {
    // No paid API request is made.
    answer = localAnswer(prompt);

  } catch (error) {
    console.error('Offline assistant error:', error);
    answer = 'Sorry! I could not process that command.';
  }

  addMessage(answer);
  speak(answer);

  if (
    $('memoryToggle') &&
    $('memoryToggle').checked
  ) {
    saveMemory(prompt, answer);
  }

  isSending = false;

  if (sendButton) sendButton.disabled = false;

  if ($('mascotMood')) {
    $('mascotMood').textContent = 'READY TO HELP';
  }
}

/* CHAT EVENTS */

if ($('sendBtn')) {
  $('sendBtn').addEventListener('click', () => {
    ask($('chatInput')?.value || '');
  });
}

if ($('chatInput')) {
  $('chatInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      ask(event.currentTarget.value);
    }
  });
}

document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    ask(button.dataset.prompt || '');
  });
});

/* VOICE SETTINGS */

if ($('speakToggle')) {
  $('speakToggle').addEventListener('click', () => {
    voiceReplies = !voiceReplies;

    $('speakToggle').textContent =
      `🔊 Voice replies: ${voiceReplies ? 'ON' : 'OFF'}`;

    if (!voiceReplies && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  });
}

/* MICROPHONE */

if ($('micBtn')) {
  $('micBtn').addEventListener('click', () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if ($('voiceStatus')) {
        $('voiceStatus').textContent =
          'Speech recognition is not supported. Try Chrome.';
      }
      return;
    }

    if (recognition) {
      recognition.stop();
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = settings.language || 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => {
      if ($('voiceStatus')) {
        $('voiceStatus').textContent = 'Listening...';
      }
    };

    recognition.onresult = (event) => {
      const heard =
        event.results?.[0]?.[0]?.transcript || '';

      if ($('chatInput')) {
        $('chatInput').value = heard;
      }

      ask(heard);
    };

    recognition.onerror = () => {
      if ($('voiceStatus')) {
        $('voiceStatus').textContent =
          'Microphone permission or recognition error.';
      }
    };

    recognition.onend = () => {
      if ($('voiceStatus')) {
        $('voiceStatus').textContent = 'Voice input ready.';
      }

      recognition = null;
    };

    try {
      recognition.start();
    } catch (error) {
      recognition = null;
      console.warn(error);
    }
  });
}

/* WEBSITE SHORTCUTS */

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

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  });
});

/* GOOGLE SEARCH */

if ($('searchForm')) {
  $('searchForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const query = $('searchInput')?.value.trim();

    if (query) {
      window.open(
        `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  });
}

/* REMINDERS */

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

  reminders.sort((a, b) => Number(a.time) - Number(b.time));

  reminders.forEach((reminder) => {
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
      reminders = reminders.filter(
        (r) => r.id !== reminder.id
      );

      saveReminders();
    });

    item.append(info, remove);
    list.append(item);
  });
}

if ($('reminderForm')) {
  $('reminderForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const text = $('reminderText')?.value.trim() || '';

    const time = new Date(
      $('reminderTime')?.value || ''
    ).getTime();

    if (!text || !Number.isFinite(time) || time <= Date.now()) {
      alert('Choose a reminder and a future date and time.');
      return;
    }

    reminders.push({
      id: Date.now().toString(),
      text,
      time,
      notified: false
    });

    saveReminders();
    event.currentTarget.reset();
  });
}

function checkReminders() {
  let changed = false;

  reminders.forEach((reminder) => {
    if (!reminder.notified && Number(reminder.time) <= Date.now()) {
      reminder.notified = true;
      changed = true;

      const message = `Reminder: ${reminder.text}`;

      addMessage(message);
      speak(message);

      if (
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification('Miss Minutes reminder', {
          body: reminder.text
        });
      } else {
        alert(message);
      }
    }
  });

  if (changed) saveReminders();
}

renderReminders();
setInterval(checkReminders, 15000);

/* NOTIFICATION PERMISSION */

if (
  $('reminderForm') &&
  'Notification' in window &&
  Notification.permission === 'default'
) {
  $('reminderForm').addEventListener(
    'focusin',
    () => Notification.requestPermission(),
    { once: true }
  );
}

/* LOCAL MEMORY */

function saveMemory(user, assistant) {
  const items = readStorage('mm_memory', []);

  const safeItems = Array.isArray(items) ? items : [];

  safeItems.push({
    date: new Date().toISOString(),
    user,
    assistant
  });

  writeStorage('mm_memory', safeItems.slice(-50));
}

if ($('memoryToggle')) {
  $('memoryToggle').checked =
    readStorage('mm_memory_enabled', false) === true;

  $('memoryToggle').addEventListener('change', () => {
    writeStorage(
      'mm_memory_enabled',
      $('memoryToggle').checked
    );

    if (!$('memoryToggle').checked && $('memoryArea')) {
      $('memoryArea').textContent =
        'Memory is off. Previously saved items remain until cleared.';
    }
  });
}

if ($('viewMemory')) {
  $('viewMemory').addEventListener('click', () => {
    const area = $('memoryArea');

    if (!area) return;

    area.hidden = false;

    const data = readStorage('mm_memory', []);

    area.textContent =
      Array.isArray(data) && data.length
        ? data.map((item) =>
            `${new Date(item.date).toLocaleString()}
You: ${item.user}
${settings.name}: ${item.assistant}`
          ).join('\n\n')
        : 'No saved memory.';
  });
}

if ($('clearMemory')) {
  $('clearMemory').addEventListener('click', () => {
    if (confirm('Clear saved Miss Minutes memory?')) {
      localStorage.removeItem('mm_memory');

      if ($('memoryArea')) {
        $('memoryArea').textContent = 'Saved memory cleared.';
      }
    }
  });
}

/* SETTINGS */

if ($('settingsBtn') && $('settingsDialog')) {
  $('settingsBtn').addEventListener('click', () => {
    $('settingsDialog').showModal();
  });
}

if ($('assistantName')) {
  $('assistantName').value = settings.name;
}

if ($('voiceLanguage')) {
  $('voiceLanguage').value = settings.language;
}

if ($('saveSettings')) {
  $('saveSettings').addEventListener('click', () => {
    settings = {
      name: $('assistantName')?.value.trim() || 'Miss Minutes',
      language: $('voiceLanguage')?.value || 'en-IN'
    };

    writeStorage('mm_settings', settings);

    if ($('settingsDialog')?.open) {
      $('settingsDialog').close();
    }
  });
}

console.log('Miss Minutes Offline Assistant initialized.');
      s Minutes reminder', { body: reminder.text });
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
                    
