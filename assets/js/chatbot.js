class Chatbot {
    constructor() {
        this.messages = [];
        this.systemPrompt = "You are Falah's portfolio assistant. Answer questions about Ahmad Mathlaul Falah's skills (Laravel, PHP, MySQL, JavaScript), projects (RSHP Hospital System, Warehouse Inventory, Book Collection Manager), education (D4 Informatics UNAIR), and availability for freelance/collaboration. Keep answers concise, friendly, and in the same language the user writes (Indonesian or English). If asked something unrelated to Falah's portfolio, politely redirect.";
        this.apiUrl = "/api/chat"; // Proxy or handler that securely holds the Anthropic API key
        
        // Use a fallback public proxy if running without backend for demonstration purposes.
        // In reality, user sets environment variables in their proxy.
        this.isTyping = false;
        
        this.init();
    }

    init() {
        this.panel = document.getElementById("chatbotPanel");
        this.toggleBtn = document.getElementById("chatbotToggle");
        this.closeBtn = document.getElementById("closeChatBtn");
        this.messagesContainer = document.getElementById("chatbotMessages");
        this.input = document.getElementById("chatInput");
        this.sendBtn = document.getElementById("sendMessageBtn");

        if (!this.panel || !this.toggleBtn) return;

        this.loadSession();
        this.bindEvents();
    }

    bindEvents() {
        this.toggleBtn.addEventListener("click", () => this.togglePanel());
        this.closeBtn.addEventListener("click", () => this.togglePanel(false));
        
        this.sendBtn.addEventListener("click", () => this.sendMessage());
        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.sendMessage();
        });
    }

    togglePanel(forceState = null) {
        const isOpen = !this.panel.classList.contains("hidden");
        const nextState = forceState !== null ? forceState : !isOpen;
        
        if (nextState) {
            this.panel.classList.remove("hidden");
            this.toggleBtn.classList.add("active");
            this.input.focus();
            setTimeout(() => this.scrollToBottom(), 100);
        } else {
            this.panel.classList.add("hidden");
            this.toggleBtn.classList.remove("active");
        }
    }

    loadSession() {
        const saved = sessionStorage.getItem("chatHistory");
        if (saved) {
            try {
                this.messages = JSON.parse(saved);
                this.messagesContainer.innerHTML = ""; // Clear initial
                this.messages.forEach(msg => {
                    if (msg.role !== "system") {
                        this.renderMessage(msg.content, msg.role, msg.timestamp);
                    }
                });
                this.scrollToBottom();
            } catch (e) {
                console.error("Failed to load chat history", e);
            }
        } else {
            // First time
            this.messages.push({
                role: "system",
                content: this.systemPrompt
            });
            const intro = "Hi! I'm Falah's AI assistant. How can I help you today?";
            this.renderMessage(intro, "assistant", this.getTimestamp());
            this.messages.push({
                role: "assistant", 
                content: intro,
                timestamp: this.getTimestamp()
            });
            this.saveSession();
        }
    }

    saveSession() {
        sessionStorage.setItem("chatHistory", JSON.stringify(this.messages));
    }

    getTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    scrollToBottom() {
        this.messagesContainer.scrollTo({
            top: this.messagesContainer.scrollHeight,
            behavior: "smooth"
        });
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text || this.isTyping) return;

        this.input.value = "";
        const time = this.getTimestamp();
        this.renderMessage(text, "user", time);
        
        this.messages.push({ role: "user", content: text, timestamp: time });
        this.saveSession();

        this.showTypingIndicator();
        this.isTyping = true;
        
        try {
            // Simulate API logic to avoid breaking frontend when no endpoint exists
            // This allows the UI to work while user provisions their actual API proxy
            const response = await this.mockAnthropicCall(text);
            this.hideTypingIndicator();
            
            const botTime = this.getTimestamp();
            this.renderMessage(response, "assistant", botTime);
            this.messages.push({ role: "assistant", content: response, timestamp: botTime });
            this.saveSession();
        } catch (error) {
            console.error("Chat API error:", error);
            this.hideTypingIndicator();
            this.renderMessage("Sorry, I'm having trouble connecting to the server. Please try again later.", "assistant", this.getTimestamp(), true);
        } finally {
            this.isTyping = false;
        }
    }

    // Since we don't have the explicit API key proxy available here, 
    // we use a simple mocked version based on keywords for offline/dev.
    // Replace with real fetch() to your Anthropic Proxy endpoint.
    async mockAnthropicCall(userText) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const lp = userText.toLowerCase();
                let ans = "I'm not sure about that, but feel free to explore Falah's projects or contact him directly!";
                if (lp.includes("laravel") || lp.includes("php")) {
                    ans = "Falah specializes in Laravel and PHP! He has built complex systems like the RSHP Hospital Information System and a complete Warehouse Inventory app.";
                } else if (lp.includes("project") || lp.includes("porto")) {
                    ans = "Falah's top projects include the RSHP Hospital System, a comprehensive Warehouse Inventory app, and a robust Book Collection Manager.";
                } else if (lp.includes("education") || lp.includes("unair") || lp.includes("study")) {
                    ans = "He is a D4 Informatics Engineering student at Universitas Airlangga (UNAIR).";
                } else if (lp.includes("hire") || lp.includes("freelance") || lp.includes("contact")) {
                    ans = "Falah is definitely open for freelance and collaboration! You can reach him through the Contact page or directly via WhatsApp.";
                } else if (lp.includes("halo") || lp.includes("hai") || lp.includes("hello")) {
                    ans = "Hello! Do you have any questions about Falah's skills or projects?";
                }
                resolve(ans);
            }, 1000 + Math.random() * 1000); // 1-2s delay
        });
    }

    /* 
    // Real implementation when using proxy:
    async fetchAnthropicResponse(messages) {
        const res = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20240620", // or claude-sonnet-4-20250514 equivalent
                system: this.systemPrompt,
                messages: messages.filter(m => m.role !== 'system').map(m => ({
                    role: m.role,
                    content: m.content
                }))
            })
        });
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        return data.content[0].text;
    }
    */

    showTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'message bot-message typing-indicator-msg';
        div.id = 'typingIndicator';
        div.innerHTML = `
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        `;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const ind = document.getElementById("typingIndicator");
        if (ind) ind.remove();
    }

    renderMessage(text, role, time, isError = false) {
        const div = document.createElement("div");
        div.className = `message ${role === "user" ? "user-message" : "bot-message"} ${isError ? "error-msg" : ""}`;
        div.innerHTML = `
            <p>${this.escapeHTML(text)}</p>
            <span class="msg-time">${time}</span>
        `;
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }
}

// Global initialization
window.addEventListener("DOMContentLoaded", () => {
    window.portfolioChatbot = new Chatbot();
});
