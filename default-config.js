// Default configuration — placeholders only (no real secrets)
// Replace values via UI settings or environment variables in production

const defaultConfig = {
    // Yandex Cloud API placeholders
    apiKey: "api-key", // Service Account API key (placeholder)
    apiId: "api-key",  // Folder/Service Account ID (placeholder)
    
    // Default plan
    defaultPlan: "dragon",
    
    // Auto-load settings (can be disabled in production)
    autoLoad: true,

    // Firebase client config (placeholders)
    firebase: {
        apiKey: "api-key",
        authDomain: "api-key",
        projectId: "api-key",
        storageBucket: "api-key",
        messagingSenderId: "api-key",
        appId: "api-key",
        measurementId: "api-key"
    }
};

// Function to load default settings
function loadDefaultSettings() {
    if (typeof localStorage !== 'undefined') {
        // Save to localStorage (placeholders if not overridden by user)
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
                    window.chatAppInstance.showNotification('API ключи загружены автоматически! (используются плейсхолдеры)', 'success');
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
