// Default configuration with your Yandex Cloud keys
// This file contains your API credentials for easy setup

const defaultConfig = {
    apiKey: "ваш-api-ключ-yandex-cloud",
    apiId: "ваш-идентификатор-yandex-cloud",
    defaultPlan: "dragon", // Service Account ID (same as apiKey for this setup)
    
    //Auto-load settings
    autoLoad: true,

    // Firebase client config (provided by user)
    firebase: {
        apiKey: "AIzaSyCjZnlL91aVEik4A1VXgoY0VYxctqEwX0E",
        authDomain: "ai-chat-bot-9a315.firebaseapp.com",
        projectId: "ai-chat-bot-9a315",
        storageBucket: "ai-chat-bot-9a315.appspot.com",
        messagingSenderId: "1017733580863",
        appId: "1:1017733580863:web:8e12656307d7f0efab508a",
        measurementId: "G-7R3NHZ0NCC"
    }
};

// Function to load default settings
function loadDefaultSettings() {
    if (typeof localStorage !== 'undefined') {
        // Save to localStorage
        localStorage.setItem('chatApiKey', defaultConfig.apiKey);
        localStorage.setItem('chatApiId', defaultConfig.apiId);
        localStorage.setItem('chatPlan', defaultConfig.defaultPlan);
        
        console.log('✅ Настройки API загружены автоматически!');
        console.log('API Key:', defaultConfig.apiKey);
        console.log('API ID:', defaultConfig.apiId);
        
        return true;
    }
    return false;
}

// Auto-load if enabled
if (defaultConfig.autoLoad && typeof window !== 'undefined') {
    // Load settings when page loads
    document.addEventListener('DOMContentLoaded', () => {
        loadDefaultSettings();
        
        // Show notification
        if (window.ChatApp) {
            setTimeout(() => {
                if (window.chatAppInstance) {
                    window.chatAppInstance.showNotification('API ключи загружены автоматически!', 'success');
                }
            }, 1000);
        }
    });
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = defaultConfig;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.DefaultConfig = defaultConfig;
    window.loadDefaultSettings = loadDefaultSettings;
}
