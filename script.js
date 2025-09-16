// Chat Application Class for GitHub Pages
class ChatApp {
    constructor() {
        this.apiKey = '';
        this.apiId = '';
        this.currentPlan = 'dragon';
        this.messages = [];
        this.isTyping = false;
        this.dragonKnowledge = new DragonKnowledgeBase();
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.updateSubscriptionStatus();
        this.preloadKBIfEmpty();

        // Initialize Markdown rendering and syntax highlighting for assistant
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                highlight: function(code, lang) {
                    if (typeof hljs !== 'undefined') {
                        try {
                            if (lang && hljs.getLanguage(lang)) {
                                return hljs.highlight(code, { language: lang }).value;
                            }
                            return hljs.highlightAuto(code).value;
                        } catch (e) {}
                    }
                    return code;
                }
            });
        }
    }

    initializeElements() {
        // Main elements
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.photoButton = document.getElementById('photoButton');
        this.photoInput = document.getElementById('photoInput');
        this.chatMessages = document.getElementById('chatMessages');
        this.welcomeSection = document.getElementById('welcomeSection');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.charCount = document.getElementById('charCount');
        
        // Auth UI
        this.currentUserNameEl = document.getElementById('currentUserName');
        this.loginBtn = document.getElementById('loginBtn');
        this.signupBtn = document.getElementById('signupBtn');
        
        // Subscription elements
        this.subscriptionStatus = document.getElementById('subscriptionStatus');
        
        // Modal elements
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsModal = document.getElementById('closeSettingsModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        // Settings elements
        this.apiKeyInput = document.getElementById('apiKey');
        this.apiIdInput = document.getElementById('apiId');
        this.saveSettingsBtn = document.querySelector('.save-settings-btn');
        this.kbInput = document.getElementById('kbInput');
        this.kbAddBtn = document.getElementById('kbAddBtn');
        this.kbBuildIndexBtn = document.getElementById('kbBuildIndexBtn');
    }

    bindEvents() {
        // Send message
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Photo upload
        this.photoButton.addEventListener('click', () => this.photoInput.click());
        this.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
            this.updateCharCount();
        });

        // Modal controls
        this.closeSettingsModal.addEventListener('click', () => this.hideSettingsModal());
        this.settingsBtn.addEventListener('click', () => this.showSettingsModal());
        this.clearBtn.addEventListener('click', () => this.clearChat());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        if (this.loginBtn) this.loginBtn.addEventListener('click', () => this.loginWithGoogle());
        if (this.signupBtn) this.signupBtn.addEventListener('click', () => this.signupWithEmail());
        if (this.kbAddBtn) this.kbAddBtn.addEventListener('click', () => this.addToKnowledgeBase());
        if (this.kbBuildIndexBtn) this.kbBuildIndexBtn.addEventListener('click', () => this.buildVectorIndex());

        // Close modals on outside click
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettingsModal();
            }
        });
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 150) + 'px';
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = `${count}/2000`;
        
        if (count > 1800) {
            this.charCount.style.color = '#ef4444';
        } else if (count > 1500) {
            this.charCount.style.color = '#fbbf24';
        } else {
            this.charCount.style.color = 'rgba(255, 255, 255, 0.7)';
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        // Проверяем специальные команды
        if (this.handleSpecialCommands(message)) {
            this.messageInput.value = '';
            this.autoResizeTextarea();
            this.updateCharCount();
            return;
        }

        // Check API configuration
        if (!this.apiKey || !this.apiId) {
            this.showNotification('Пожалуйста, настройте API ключи в настройках', 'error');
            this.showSettingsModal();
            return;
        }

        // Dragon plan has no limits

        // RAG: build context
        const ragContext = this.retrieveKnowledgeContext(message, 4);

        // Add user message
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.updateCharCount();
        this.hideWelcomeSection();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Get AI response using Yandex Cloud API directly
            const response = await this.getAIResponse(ragContext ? `${ragContext}\n\nВопрос пользователя: ${message}` : message);
            this.hideTypingIndicator();
            this.addMessage(response, 'assistant');
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Извините, произошла ошибка при обработке запроса. Попробуйте еще раз.', 'assistant');
            console.error('AI Response Error:', error);
        }
    }

    // Обработка специальных команд
    handleSpecialCommands(message) {
        const lowerMessage = message.toLowerCase();
        
        // Команды для работы с базой знаний
        if (lowerMessage === '/факт' || lowerMessage === '/fact') {
            this.showRandomFact();
            return true;
        }
        
        if (lowerMessage === '/статистика' || lowerMessage === '/stats') {
            this.showKnowledgeStats();
            return true;
        }
        
        if (lowerMessage.startsWith('/поиск ') || lowerMessage.startsWith('/search ')) {
            const query = message.substring(message.indexOf(' ') + 1);
            this.searchInKnowledge(query);
            return true;
        }
        
        if (lowerMessage === '/помощь' || lowerMessage === '/help') {
            this.showHelp();
            return true;
        }
        
        // Обработка приветствий и просьб о коде
        if (this.handleGreetingsAndCodeRequests(message)) {
            return true;
        }
        
        return false;
    }

    // Обработка приветствий и просьб о коде
    handleGreetingsAndCodeRequests(message) {
        const lowerMessage = message.toLowerCase().trim();
        
        // Приветствия
        const greetings = [
            'привет', 'здравствуй', 'здравствуйте', 'hi', 'hello', 
            'добро пожаловать', 'добрый день', 'добрый вечер', 'доброе утро',
            'салют', 'хай', 'приветик', 'приветствую'
        ];
        
        // Просьбы о коде
        const codeRequests = [
            'сделай код', 'напиши код', 'создай код', 'помоги с кодом',
            'напиши программу', 'создай программу', 'сделай скрипт',
            'напиши скрипт', 'создай сайт', 'сделай сайт', 'напиши сайт',
            'код', 'программа', 'скрипт', 'сайт'
        ];
        
        // Проверяем приветствия
        for (const greeting of greetings) {
            if (lowerMessage.includes(greeting)) {
                this.searchInKnowledge('Привет');
                return true;
            }
        }
        
        // Проверяем просьбы о коде
        for (const codeRequest of codeRequests) {
            if (lowerMessage.includes(codeRequest)) {
                this.searchInKnowledge('Сделай код');
                return true;
            }
        }
        
        return false;
    }

    // Показать справку по командам
    showHelp() {
        const helpMessage = `🐉 **Команды Dragon Chat:**\n\n` +
            `**База знаний:**\n` +
            `• \`/факт\` - показать случайный факт\n` +
            `• \`/статистика\` - статистика базы знаний\n` +
            `• \`/поиск [запрос]\` - поиск в базе знаний\n\n` +
            `**Общие:**\n` +
            `• \`/помощь\` - показать эту справку\n\n` +
            `**Примеры:**\n` +
            `• \`/поиск программирование\`\n` +
            `• \`/поиск машинное обучение\`\n` +
            `• \`/поиск здоровье\`\n\n` +
            `**База знаний Dragon содержит:**\n` +
            `💻 Программирование и разработка\n` +
            `🤖 Искусственный интеллект\n` +
            `💼 Бизнес и стартапы\n` +
            `🔬 Наука и технологии\n` +
            `🏥 Здоровье и медицина\n` +
            `📚 Образование и саморазвитие\n` +
            `💬 Общение и приветствия\n` +
            `🏛️ История и культура\n` +
            `🌍 География и природа\n` +
            `🧠 Психология и отношения\n` +
            `⚡ Технологии и инновации\n` +
            `🤔 Философия и мышление\n` +
            `🍳 Кулинария и питание\n` +
            `💪 Спорт и фитнес\n` +
            `🎨 Искусство и творчество`;
        
        this.addMessage(helpMessage, 'assistant');
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-dragon"></i>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        if (sender === 'assistant' && typeof marked !== 'undefined') {
            messageText.innerHTML = marked.parse(text);
        } else {
            messageText.textContent = text;
        }
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Feedback controls for assistant answers
        if (sender === 'assistant') {
            const controls = document.createElement('div');
            controls.style.marginTop = '8px';
            controls.style.display = 'flex';
            controls.style.gap = '8px';
            const notHelpful = document.createElement('button');
            notHelpful.textContent = 'Этот ответ не помог';
            notHelpful.style.cssText = 'background: rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.4); color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer;';
            const saveHelpful = document.createElement('button');
            saveHelpful.textContent = 'Сохранить в базу';
            saveHelpful.style.cssText = 'background: rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.4); color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer;';

            // capture current question (last user message before this assistant message)
            const lastUser = [...this.messages].reverse().find(m => m.sender === 'user');
            const questionText = lastUser?.text || '';

            notHelpful.addEventListener('click', async () => {
                this.savePairToKB(questionText, text, 'not_helpful');
                this.showNotification('Пара вопрос/ответ добавлена в базу. Пытаюсь улучшить ответ...', 'warning');
                try {
                    const improved = await this.getAIResponse(`Проанализируй, почему ответ ниже не помог, укажи 1-2 причины кратко, затем дай улучшенный, конкретный ответ с шагами и примерами.
Контекст базы знаний, если есть, используй приоритенно.

Вопрос: ${questionText}
Неудачный ответ:
${text}`);
                    this.addMessage(improved, 'assistant');
                } catch (e) {
                    this.showNotification('Не удалось улучшить ответ', 'error');
                }
            });

            saveHelpful.addEventListener('click', () => {
                this.savePairToKB(questionText, text, 'helpful');
                this.showNotification('Сохранено в базу знаний', 'success');
            });

            controls.appendChild(notHelpful);
            controls.appendChild(saveHelpful);
            content.appendChild(controls);
        }

        content.appendChild(messageText);
        content.appendChild(messageTime);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Store message
        this.messages.push({ text, sender, timestamp: new Date() });
    }

    showTypingIndicator() {
        this.isTyping = true;
        this.typingIndicator.style.display = 'flex';
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.typingIndicator.style.display = 'none';
    }

    hideWelcomeSection() {
        if (this.welcomeSection) {
            this.welcomeSection.style.display = 'none';
        }
    }

    async getAIResponse(message) {
        // Try serverless-free (mock) if no API key set
        if (!this.apiKey || !this.apiId) {
            const rag = this.retrieveKnowledgeContext(message, 5);
            const prompt = rag ? `${rag}\n\nВопрос пользователя: ${message}` : message;
            return await this.getMockAIResponse(prompt);
        }
        try {
            // Direct call to Yandex Cloud API
            const rag = this.retrieveKnowledgeContext(message, 5);
            const prompt = rag ? `${rag}\n\nВопрос пользователя: ${message}` : message;
            const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
                method: 'POST',
                headers: {
                    'Authorization': `Api-Key ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    modelUri: `gpt://${this.apiId}/yandexgpt`,
                    completionOptions: {
                        stream: false,
                        temperature: 0.6,
                        maxTokens: 2000
                    },
                    messages: [
                        {
                            role: 'system',
                            text: 'Ты полезный ИИ ассистент Dragon. Отвечай на русском языке, дружелюбно и структурировано в Markdown. Добавляй готовые код-сниппеты и пошаговые инструкции. Если есть контекст из базы знаний — используй его приоритетно и ссылайся на него кратко.'
                        },
                        {
                            role: 'user',
                            text: prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'API request failed');
            }

            const data = await response.json();
            return data.result.alternatives[0].message.text;
        } catch (error) {
            // Fallback to mock response with RAG
            console.warn('API not available, using mock response:', error.message);
            const rag = this.retrieveKnowledgeContext(message, 5);
            const prompt = rag ? `${rag}\n\nВопрос пользователя: ${message}` : message;
            return await this.getMockAIResponse(prompt);
        }
    }

    // Mock AI response for demonstration
    async getMockAIResponse(message) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        const responses = [
            "Это интересный вопрос! Позвольте мне подумать...",
            "Я понимаю, что вы имеете в виду. Вот что я могу сказать по этому поводу:",
            "Отличный вопрос! Основываясь на моих знаниях, я бы рекомендовал:",
            "Это сложная тема, но я постараюсь дать вам максимально полезный ответ:",
            "Спасибо за ваш вопрос! Вот мой анализ ситуации:"
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const detailedResponse = this.generateDetailedResponse(message);
        
        return `${randomResponse}\n\n${detailedResponse}`;
    }

    generateDetailedResponse(message) {
        // Более полезный мок-ответ с примерами кода/шагами
        const m = message.toLowerCase();
        if (m.includes('погода')) {
            return `Вот как получить текущую погоду бесплатно:

1) Откройте сайт gismeteo.ru или open-meteo.com
2) Для кода — используйте бесплатный API Open-Meteo (без ключей):

```javascript
// Пример: погода по координатам (Москва)
async function getWeather() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.62&current_weather=true&timezone=auto';
  const r = await fetch(url);
  const data = await r.json();
  return data.current_weather; // температура, ветер и т.д.
}
getWeather().then(console.log);
```
`;
        }
        if (m.includes('создай код') || m.includes('напиши код') || m.includes('сделай код')) {
            return `Готово! Вот шаблон для быстрого старта сайта:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Старт</title>
  <style>body{font-family:Arial;margin:40px}</style>
</head>
<body>
  <h1>Привет, мир!</h1>
  <p>Это стартовый шаблон.</p>
  <script>
    console.log('Готово!');
  </script>
</body>
</html>
```

Хочешь другой стек? Скажи, какой именно (React, Node, Python, Telegram-бот и т.д.).`;
        }
        // По умолчанию — нейтральный полезный ответ
        return `Вот что можно сделать:

- Уточните цель и желаемый результат
- Если нужен код — укажите язык/фреймворк и пример входных данных
- При необходимости добавлю шаги установки и запуска`;
    }

    showSettingsModal() {
        this.settingsModal.classList.add('show');
        this.apiKeyInput.value = this.apiKey;
        this.apiIdInput.value = this.apiId;
    }

    hideSettingsModal() {
        this.settingsModal.classList.remove('show');
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Dragon plan allows unlimited photos
        this.processPhoto(file);
    }

    processPhoto(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoData = e.target.result;
            this.addPhotoMessage(photoData, file.name);
        };
        reader.readAsDataURL(file);
    }

    addPhotoMessage(photoData, fileName) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-user"></i>';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const photoContainer = document.createElement('div');
        photoContainer.className = 'photo-container';
        
        const photoImg = document.createElement('img');
        photoImg.src = photoData;
        photoImg.className = 'message-photo';
        photoImg.alt = 'Отправленное фото';
        
        const photoInfo = document.createElement('div');
        photoInfo.className = 'photo-info';
        photoInfo.innerHTML = `<i class="fas fa-camera"></i> ${fileName}`;
        
        photoContainer.appendChild(photoImg);
        photoContainer.appendChild(photoInfo);
        content.appendChild(photoContainer);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        content.appendChild(messageTime);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        // Store message
        this.messages.push({ 
            type: 'photo', 
            data: photoData, 
            fileName: fileName, 
            sender: 'user', 
            timestamp: new Date() 
        });
    }

    // Auth helpers (Google + Email/Password via Firebase compat CDN)
    async loginWithGoogle() {
        try {
            if (!this.auth) return this.showNotification('Авторизация недоступна', 'warning');
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
            this.showNotification('Вход выполнен', 'success');
            if (this.currentUserNameEl) {
                const name = this.auth.currentUser?.displayName || 'Пользователь';
                this.currentUserNameEl.textContent = name;
            }
        } catch (e) {
            this.showNotification('Ошибка входа через Google', 'error');
        }
    }

    async signupWithEmail() {
        try {
            if (!this.auth) return this.showNotification('Регистрация недоступна', 'warning');
            const email = prompt('Введите email:');
            const pass = email ? prompt('Создайте пароль:') : null;
            if (!email || !pass) return;
            await this.auth.createUserWithEmailAndPassword(email, pass);
            const name = prompt('Введите имя пользователя (ник):');
            if (name && name.trim()) {
                localStorage.setItem('chatDisplayName', name.trim());
                if (this.currentUserNameEl) this.currentUserNameEl.textContent = name.trim();
            }
            this.showNotification('Регистрация выполнена', 'success');
        } catch (e) {
            this.showNotification('Ошибка регистрации', 'error');
        }
    }

    getUserId() {
        let userId = localStorage.getItem('chatUserId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chatUserId', userId);
        }
        return userId;
    }

    updateSubscriptionStatus() {
        const planElement = this.subscriptionStatus.querySelector('.plan-name');
        if (planElement) {
            planElement.textContent = 'Dragon';
        }
    }

    saveSettings() {
        this.apiKey = this.apiKeyInput.value.trim();
        this.apiId = this.apiIdInput.value.trim();
        
        localStorage.setItem('chatApiKey', this.apiKey);
        localStorage.setItem('chatApiId', this.apiId);
        
        this.showNotification('Настройки сохранены!', 'success');
        this.hideSettingsModal();
    }

    loadSettings() {
        this.apiKey = localStorage.getItem('chatApiKey') || '';
        this.apiId = localStorage.getItem('chatApiId') || '';
        this.currentPlan = 'dragon';
        
        // Auto-load default settings if available
        if (typeof window !== 'undefined' && window.DefaultConfig && window.DefaultConfig.autoLoad) {
            if (!this.apiKey || !this.apiId) {
                this.apiKey = window.DefaultConfig.apiKey;
                this.apiId = window.DefaultConfig.apiId;
                localStorage.setItem('chatApiKey', this.apiKey);
                localStorage.setItem('chatApiId', this.apiId);
                console.log('🔑 API ключи загружены из конфигурации по умолчанию');
            }

            // Initialize Firebase Auth (compat via CDN)
            try {
                if (window.DefaultConfig.firebase && window.firebase) {
                    if (!firebase.apps?.length) {
                        firebase.initializeApp(window.DefaultConfig.firebase);
                    }
                    this.auth = firebase.auth();
                    this.auth.onAuthStateChanged((user) => {
                        if (user) {
                            const name = localStorage.getItem('chatDisplayName') || user.displayName || 'Пользователь';
                            if (this.currentUserNameEl) this.currentUserNameEl.textContent = name;
                        } else {
                            if (this.currentUserNameEl) this.currentUserNameEl.textContent = 'Гость';
                        }
                    });
                }
            } catch (e) {
                console.warn('Firebase init warning:', e);
            }
        }
    }

    clearChat() {
        if (confirm('Вы уверены, что хотите очистить чат?')) {
            this.chatMessages.innerHTML = '';
            this.messages = [];
            this.welcomeSection.style.display = 'flex';
        }
    }

    // --- RAG KB methods ---
    addToKnowledgeBase() {
        const text = (this.kbInput?.value || '').trim();
        if (!text) {
            this.showNotification('Добавьте текст для базы знаний', 'warning');
            return;
        }
        const chunks = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
        const kb = JSON.parse(localStorage.getItem('chatKB') || '[]');
        chunks.forEach(c => kb.push({ id: 'kb_' + Date.now() + '_' + Math.random().toString(36).slice(2), text: c }));
        localStorage.setItem('chatKB', JSON.stringify(kb));
        if (this.kbInput) this.kbInput.value = '';
        this.showNotification(`Добавлено в базу: ${chunks.length} фрагм.`, 'success');
        // Автообновление индекса при наличии
        if (this.vectorIndex) this.buildVectorIndex(true);
    }

    async buildVectorIndex(silent = false) {
        try {
            if (!window.transformers) {
                this.showNotification('Библиотека embeddings не загружена', 'error');
                return;
            }
            const { pipeline } = window.transformers;
            if (!this.embedder) {
                // Легкая модель; достаточно для базового семантического поиска
                this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            }
            const dragonKnowledge = this.dragonKnowledge.getAllKnowledgeForRAG();
            const userKB = JSON.parse(localStorage.getItem('chatKB') || '[]');
            const allKB = [...dragonKnowledge, ...userKB];
            const docs = allKB.map(d => ({ id: d.id || ('doc_' + Math.random().toString(36).slice(2)), text: d.text.slice(0, 2000) }));
            const batchSize = 16;
            const vectors = [];
            for (let i = 0; i < docs.length; i += batchSize) {
                const batch = docs.slice(i, i + batchSize);
                const emb = await this.embedder(batch.map(b => b.text), { pooling: 'mean', normalize: true });
                // emb может быть Tensor с dims [B, D] и data Float32Array
                if (emb && emb.data && emb.dims && emb.dims.length === 2) {
                    const B = emb.dims[0], D = emb.dims[1];
                    for (let bi = 0; bi < B; bi++) {
                        const vec = Array.from(emb.data.slice(bi * D, (bi + 1) * D));
                        vectors.push({ id: batch[bi].id, text: batch[bi].text, vec });
                    }
                } else if (Array.isArray(emb)) {
                    emb.forEach((e, idx) => {
                        const vec = e.data ? Array.from(e.data) : (Array.isArray(e) ? e : []);
                        vectors.push({ id: batch[idx].id, text: batch[idx].text, vec });
                    });
                }
            }
            this.vectorIndex = vectors;
            if (!silent) this.showNotification(`Построен векторный индекс: ${vectors.length} фрагм.`, 'success');
        } catch (e) {
            console.warn('Vector index build error', e);
            this.showNotification('Ошибка построения индекса', 'error');
        }
    }

    retrieveKnowledgeContext(query, topK = 4) {
        // Получаем знания из встроенной базы Dragon
        const dragonKnowledge = this.dragonKnowledge.getAllKnowledgeForRAG();
        
        // Получаем пользовательские знания
        const userKB = JSON.parse(localStorage.getItem('chatKB') || '[]');
        
        // Объединяем все знания
        const allKB = [...dragonKnowledge, ...userKB];
        if (!allKB.length) return '';
        
        // Если есть векторный индекс — используем косинусное сходство по эмбеддингам
        if (this.vectorIndex && window.transformers) {
            const q = query.slice(0, 1000);
            return this.semanticSearchContext(q, topK);
        }
        
        // Фолбэк: TF-IDF
        const tokenize = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
        const qTokens = tokenize(query);
        if (!qTokens.length) return '';
        
        const idfMap = new Map();
        allKB.forEach(doc => { 
            const terms = new Set(tokenize(doc.text)); 
            terms.forEach(t => idfMap.set(t, (idfMap.get(t) || 0) + 1)); 
        });
        
        const N = allKB.length;
        const idf = (t) => Math.log(1 + N / ((idfMap.get(t) || 0) + 1));
        const qVec = new Map();
        qTokens.forEach(t => qVec.set(t, (qVec.get(t) || 0) + 1));
        qVec.forEach((v, t) => qVec.set(t, v * idf(t)));
        
        const dot = (a, b) => { let s = 0; a.forEach((av, t) => { const bv = b.get(t) || 0; s += av * bv; }); return s; };
        const norm = (a) => Math.sqrt(Array.from(a.values()).reduce((s, v) => s + v * v, 0));
        
        const scored = allKB.map(doc => {
            const tfs = new Map();
            tokenize(doc.text).forEach(t => tfs.set(t, (tfs.get(t) || 0) + 1));
            tfs.forEach((v, t) => tfs.set(t, v * idf(t)));
            const score = dot(qVec, tfs) / ((norm(qVec) * norm(tfs)) || 1);
            return { score, text: doc.text, source: doc.id ? (doc.id.startsWith('dragon_') ? 'Dragon Knowledge' : 'User Knowledge') : 'Unknown' };
        }).sort((a, b) => b.score - a.score).slice(0, topK);
        
        if (!scored.length || scored[0].score <= 0) return '';
        const context = scored.map((s, i) => `Контекст ${i + 1} (${s.source}):\n${s.text}`).join('\n\n');
        return `Ниже фрагменты базы знаний Dragon и пользовательских материалов. Используй их при ответе:\n\n${context}`;
    }

    // Семантический поиск по векторному индексу
    async semanticSearchContext(query, topK = 4) {
        try {
            const { pipeline } = window.transformers;
            if (!this.embedder) {
                this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            }
            const emb = await this.embedder(query);
            const tensor = emb[0] ? emb : [emb];
            const qVec = tensor.mean ? Array.from(tensor.mean(1).dataSync ? tensor.mean(1).dataSync() : tensor.mean(1).data) : Array.from(tensor[0]);

            const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
            const norm = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0));
            const qn = norm(qVec) || 1;

            const scored = this.vectorIndex
                .map(d => ({
                    score: dot(qVec, d.vec) / ((qn * (Math.sqrt(d.vec.reduce((s, v) => s + v * v, 0)) || 1))),
                    text: d.text,
                    source: d.id?.startsWith('dragon_') ? 'Dragon Knowledge' : 'User Knowledge'
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);

            if (!scored.length) return '';
            const context = scored.map((s, i) => `Контекст ${i + 1} (${s.source}):\n${s.text}`).join('\n\n');
            return `Ниже фрагменты базы знаний Dragon и пользовательских материалов. Используй их при ответе:\n\n${context}`;
        } catch (e) {
            console.warn('semanticSearchContext error', e);
            return '';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '600',
            zIndex: '10000',
            animation: 'slideInRight 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.background = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Save QA pair into KB as text chunks for RAG
    savePairToKB(question, answer, tag) {
        const kb = JSON.parse(localStorage.getItem('chatKB') || '[]');
        const entry = `Тип: ${tag}\nВопрос: ${question}\nОтвет: ${answer}`;
        kb.push({ id: 'kb_pair_' + Date.now() + '_' + Math.random().toString(36).slice(2), text: entry });
        localStorage.setItem('chatKB', JSON.stringify(kb));
    }

    // Показать случайный факт из базы знаний Dragon
    showRandomFact() {
        const fact = this.dragonKnowledge.getRandomFact();
        this.addMessage(`🐉 **Интересный факт из базы знаний Dragon:**\n\n**${fact.question}**\n\n${fact.answer}`, 'assistant');
    }

    // Предзагрузка полезной KB при первом запуске
    preloadKBIfEmpty() {
        const existing = JSON.parse(localStorage.getItem('chatKB') || '[]');
        if (existing.length) return;
        const seed = [
            { t: 'Шаблон HTML стартовой страницы',
              c: `Стартовый HTML-шаблон:

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Старт</title>
  <style>body{font-family:Arial;margin:40px}</style>
</head>
<body>
  <h1>Привет, мир!</h1>
  <p>Это стартовый шаблон.</p>
</body>
</html>` },
            { t: 'JavaScript: получение погоды без ключей',
              c: `Open-Meteo пример (без API ключей):

```javascript
async function getWeather(lat=55.75, lon=37.62) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
  const r = await fetch(url);
  const data = await r.json();
  return data.current_weather;
}
getWeather().then(console.log);
``` ` },
            { t: 'Node.js Express сервер-шаблон',
              c: `Мини-сервер:

```javascript
const express = require('express');
const app = express();
app.use(express.json());
app.get('/ping', (req, res) => res.json({ ok: true }));
app.listen(3000, () => console.log('http://localhost:3000'));
``` ` },
            { t: 'CSS: базовый responsive контейнер',
              c: `CSS контейнер:

```css
.container{max-width:960px;margin:0 auto;padding:0 16px}
@media (max-width:600px){.container{padding:0 10px}}
``` ` }
        ];
        const kb = seed.map(s => ({ id: 'seed_' + Math.random().toString(36).slice(2), text: `Тема: ${s.t}
${s.c}` }));
        localStorage.setItem('chatKB', JSON.stringify(kb));
        this.showNotification('Загружены стартовые материалы в базу знаний', 'success');
    }

    // Показать статистику базы знаний
    showKnowledgeStats() {
        const stats = this.dragonKnowledge.getStats();
        const userKB = JSON.parse(localStorage.getItem('chatKB') || '[]');
        
        let statsMessage = `📊 **Статистика базы знаний Dragon:**\n\n`;
        statsMessage += `**Встроенная база Dragon:**\n`;
        statsMessage += `• Категорий: ${stats.totalCategories}\n`;
        statsMessage += `• Всего знаний: ${stats.totalItems}\n\n`;
        
        statsMessage += `**По категориям:**\n`;
        Object.keys(stats.categoryBreakdown).forEach(category => {
            const emoji = this.getCategoryEmoji(category);
            statsMessage += `${emoji} ${category}: ${stats.categoryBreakdown[category]} знаний\n`;
        });
        
        statsMessage += `\n**Пользовательская база:**\n`;
        statsMessage += `• Добавлено вами: ${userKB.length} фрагментов\n`;
        
        statsMessage += `\n**Общий объем знаний:** ${stats.totalItems + userKB.length} фрагментов`;
        
        this.addMessage(statsMessage, 'assistant');
    }

    // Получить эмодзи для категории
    getCategoryEmoji(category) {
        const emojis = {
            'programming': '💻',
            'ai': '🤖',
            'business': '💼',
            'science': '🔬',
            'health': '🏥',
            'education': '📚',
            'communication': '💬',
            'history': '🏛️',
            'geography': '🌍',
            'psychology': '🧠',
            'technology': '⚡',
            'philosophy': '🤔',
            'cooking': '🍳',
            'fitness': '💪',
            'art': '🎨'
        };
        return emojis[category] || '📖';
    }

    // Поиск в базе знаний
    searchInKnowledge(query) {
        const results = this.dragonKnowledge.searchKnowledge(query);
        
        if (results.length === 0) {
            this.addMessage(`🔍 По запросу "${query}" ничего не найдено в базе знаний Dragon. Попробуйте переформулировать вопрос или добавьте свои знания в настройках.`, 'assistant');
            return;
        }
        
        let searchMessage = `🔍 **Результаты поиска в базе знаний Dragon:**\n\n`;
        
        results.slice(0, 3).forEach((result, index) => {
            const emoji = this.getCategoryEmoji(result.category);
            searchMessage += `**${index + 1}. ${emoji} ${result.question}**\n`;
            searchMessage += `${result.answer}\n\n`;
        });
        
        if (results.length > 3) {
            searchMessage += `*... и еще ${results.length - 3} результатов*`;
        }
        
        this.addMessage(searchMessage, 'assistant');
    }
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Initialize the chat application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
