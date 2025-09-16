// Chat Application Class for GitHub Pages
class ChatApp {
    constructor() {
        this.apiKey = '';
        this.apiId = '';
        this.currentPlan = 'dragon';
        this.messages = [];
        this.isTyping = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.updateSubscriptionStatus();

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
        try {
            // Direct call to Yandex Cloud API
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
                        temperature: 0.7,
                        maxTokens: 4000
                    },
                    messages: [
                        {
                            role: 'system',
                            text: 'Ты полезный ИИ ассистент Dragon. Отвечай на русском языке, будь дружелюбным и информативным. Давай развернутые и полезные ответы. Ты обладаешь расширенными возможностями и можешь помочь с любыми вопросами. Форматируй ответ в Markdown. Если запрос о коде/командах — дай готовые сниппеты внутри тройных бэктиков с указанием языка. Добавь краткие пояснения и шаги запуска.'
                        },
                        {
                            role: 'user',
                            text: message
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
            // Fallback to mock response if API is not available
            console.warn('API not available, using mock response:', error.message);
            return await this.getMockAIResponse(message);
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
        // Simple mock response generation
        const keywords = message.toLowerCase().split(' ');
        let response = "Основываясь на вашем запросе, я могу предложить следующее:\n\n";
        
        if (keywords.includes('программирование') || keywords.includes('код')) {
            response += "• Рекомендую изучить основы алгоритмов и структур данных\n";
            response += "• Практикуйтесь на платформах типа LeetCode или HackerRank\n";
            response += "• Изучите современные фреймворки и инструменты\n";
        } else if (keywords.includes('бизнес') || keywords.includes('стартап')) {
            response += "• Проведите анализ рынка и конкурентов\n";
            response += "• Создайте MVP (минимально жизнеспособный продукт)\n";
            response += "• Найдите целевую аудиторию и получите обратную связь\n";
        } else if (keywords.includes('искусственный') || keywords.includes('ии') || keywords.includes('ai')) {
            response += "• Изучите основы машинного обучения и нейронных сетей\n";
            response += "• Практикуйтесь с популярными библиотеками (TensorFlow, PyTorch)\n";
            response += "• Изучите этические аспекты ИИ\n";
        } else {
            response += "• Это важная тема, требующая детального изучения\n";
            response += "• Рекомендую обратиться к экспертам в данной области\n";
            response += "• Рассмотрите различные точки зрения на проблему\n";
        }
        
        response += "\nЕсли у вас есть дополнительные вопросы, не стесняйтесь спрашивать!";
        return response;
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
    }

    retrieveKnowledgeContext(query, topK = 4) {
        const kb = JSON.parse(localStorage.getItem('chatKB') || '[]');
        if (!kb.length) return '';
        const tokenize = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
        const qTokens = tokenize(query);
        if (!qTokens.length) return '';
        const idfMap = new Map();
        kb.forEach(doc => { const terms = new Set(tokenize(doc.text)); terms.forEach(t => idfMap.set(t, (idfMap.get(t) || 0) + 1)); });
        const N = kb.length;
        const idf = (t) => Math.log(1 + N / ((idfMap.get(t) || 0) + 1));
        const qVec = new Map();
        qTokens.forEach(t => qVec.set(t, (qVec.get(t) || 0) + 1));
        qVec.forEach((v, t) => qVec.set(t, v * idf(t)));
        const dot = (a, b) => { let s = 0; a.forEach((av, t) => { const bv = b.get(t) || 0; s += av * bv; }); return s; };
        const norm = (a) => Math.sqrt(Array.from(a.values()).reduce((s, v) => s + v * v, 0));
        const scored = kb.map(doc => {
            const tfs = new Map();
            tokenize(doc.text).forEach(t => tfs.set(t, (tfs.get(t) || 0) + 1));
            tfs.forEach((v, t) => tfs.set(t, v * idf(t)));
            const score = dot(qVec, tfs) / ((norm(qVec) * norm(tfs)) || 1);
            return { score, text: doc.text };
        }).sort((a, b) => b.score - a.score).slice(0, topK);
        if (!scored.length || scored[0].score <= 0) return '';
        const context = scored.map((s, i) => `Контекст ${i + 1}:
${s.text}`).join('\n\n');
        return `Ниже фрагменты базы знаний. Используй их при ответе:\n\n${context}`;
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
