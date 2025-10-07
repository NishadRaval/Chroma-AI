document.addEventListener('DOMContentLoaded', () => {

    const appContainer = document.getElementById('app-container');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const sendIcon = document.getElementById('send-icon');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorContainer = document.getElementById('error-container');
    const newChatBtn = document.getElementById('new-chat-btn');
    const timeElement = document.getElementById('current-time');
    const conversationHistoryContainer = document.getElementById('conversation-history');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const filePreviewContainer = document.getElementById('file-preview-container');


    const API_KEY = "AIzaSyAzF61hHS4fVQjvKQ8JZBB3A5ddDlckQbY";

    let currentConversationId = null;
    let attachedFile = null;


    const getConversations = () => JSON.parse(localStorage.getItem('conversations')) || {};
    const saveConversations = (conversations) => localStorage.setItem('conversations', JSON.stringify(conversations));

    const formatAIResponse = (text) => {
        let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let formattedText = safeText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        const blocks = formattedText.split('\n');
        let html = '';
        let inList = false;
        blocks.forEach(block => {
            block = block.trim();
            if (block.startsWith('* ')) {
                if (!inList) { html += '<ul>'; inList = true; }
                html += `<li>${block.substring(2)}</li>`;
            } else {
                if (inList) { html += '</ul>'; inList = false; }
                if (block) { html += `<p>${block}</p>`; }
            }
        });
        if (inList) html += '</ul>';
        return html;
    };
    
    const handleDeleteConversation = (idToDelete) => {
        let conversations = getConversations();
        delete conversations[idToDelete];
        saveConversations(conversations);

        if (currentConversationId === idToDelete) {
            const remainingIds = Object.keys(conversations).sort((a, b) => b - a);
            loadConversation(remainingIds.length > 0 ? remainingIds[0] : null);
        } else {
            renderSidebar();
        }
    };

    const renderSidebar = () => {
        const conversations = getConversations();
        conversationHistoryContainer.innerHTML = '';
        Object.keys(conversations).sort((a, b) => b - a).forEach(id => {
            const conversation = conversations[id];
            const itemContainer = document.createElement('div');
            itemContainer.className = 'history-item';
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = conversation.title;
            link.dataset.id = id;
            if (id === currentConversationId) link.classList.add('active');
            link.onclick = (e) => { e.preventDefault(); loadConversation(id); };
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat-btn';
            deleteBtn.setAttribute('aria-label', 'Delete chat');
            deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;
            deleteBtn.onclick = (e) => { e.stopPropagation(); handleDeleteConversation(id); };
            itemContainer.appendChild(link);
            itemContainer.appendChild(deleteBtn);
            conversationHistoryContainer.appendChild(itemContainer);
        });
    };

    const loadConversation = (id) => {
        if (!id) { startNewChat(); return; }
        const conversations = getConversations();
        if (!conversations[id]) { startNewChat(); return; }
        currentConversationId = id;
        const conversation = conversations[id];
        chatContainer.innerHTML = '';
        conversation.messages.forEach(msg => addMessageToUI(msg.sender, msg.content, msg.fileInfo));
        renderSidebar();
        userInput.focus();
    };

    const startNewChat = () => {
        currentConversationId = null;
        chatContainer.innerHTML = '';
        addMessageToUI('ai', "I am Chroma AI. How can I assist you?");
        renderSidebar();
        userInput.focus();
        removeFile();
    };
    
    const addMessageToUI = (sender, content, fileInfo = null) => {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${sender}-message`;
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        let finalContent = (sender === 'ai') ? formatAIResponse(content) : content;
        if (fileInfo) finalContent += `<br><small><em>(Attached: ${fileInfo.name})</em></small>`;
        bubble.innerHTML = finalContent;
        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    };
    
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            showError("Only image files are currently supported.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            attachedFile = {
                mimeType: file.type,
                data: e.target.result.split(',')[1],
                name: file.name
            };
            displayFilePreview();
        };
        reader.readAsDataURL(file);
    };

    const displayFilePreview = () => {
        if (!attachedFile) return;
        filePreviewContainer.innerHTML = `
            <div class="file-preview">
                <img src="data:${attachedFile.mimeType};base64,${attachedFile.data}" alt="Image preview">
                <span>${attachedFile.name}</span>
                <button id="remove-file-btn" aria-label="Remove file">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </button>
            </div>
        `;
        document.getElementById('remove-file-btn').addEventListener('click', removeFile);
    };

    const removeFile = () => {
        attachedFile = null;
        fileInput.value = '';
        filePreviewContainer.innerHTML = '';
    };
    
    const handleSendMessage = async () => {
        const userMessage = userInput.value.trim();
        if ((!userMessage && !attachedFile) || sendBtn.disabled) return;
        if (!API_KEY) { showError("API key is missing."); return; }
        
        setLoading(true);
        errorContainer.innerHTML = '';
        
        const fileInfoForMessage = attachedFile ? { name: attachedFile.name } : null;
        addMessageToUI('user', userMessage, fileInfoForMessage);

        let conversations = getConversations();
        let isNewChat = false;
        if (!currentConversationId) {
            isNewChat = true;
            currentConversationId = Date.now().toString();
            conversations[currentConversationId] = {
                id: currentConversationId,
                title: userMessage.substring(0, 30) || "Image Analysis",
                messages: [{ sender: 'ai', content: "I am Chroma AI. How can I assist you?" }]
            };
        }
        
        const userMessageToSave = { sender: 'user', content: userMessage, file: attachedFile };
        conversations[currentConversationId].messages.push(userMessageToSave);
        saveConversations(conversations);
        if(isNewChat) renderSidebar();
        
        const apiHistory = [];
        conversations[currentConversationId].messages.forEach(msg => {
            const parts = [];
            if (msg.content) parts.push({ text: msg.content });
            if (msg.file) parts.push({ inlineData: { mimeType: msg.file.mimeType, data: msg.file.data } });
            if (parts.length > 0) {
                 apiHistory.push({ role: msg.sender === 'user' ? 'user' : 'model', parts: parts });
            }
        });
        
        userInput.value = '';
        const sentFile = attachedFile;
        removeFile();

        try {
            const model = sentFile ? 'gemini-pro-vision' : 'gemini-2.5-flash-preview-05-20';
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: apiHistory }),
            });

            if (!response.ok) throw new Error((await response.json()).error?.message || "Network error.");
            const result = await response.json();
            const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (aiResponse) {
                addMessageToUI('ai', aiResponse);
                let convos = getConversations();
                convos[currentConversationId].messages.push({ sender: 'ai', content: aiResponse });
                saveConversations(convos);
            } else {
                addMessageToUI('ai', "I'm sorry, I received an empty response.");
            }

        } catch (error) {
            showError(`An error occurred: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const setLoading = (isLoading) => {
        sendBtn.disabled = isLoading;
        userInput.disabled = isLoading;
        sendIcon.classList.toggle('hidden', isLoading);
        loadingSpinner.classList.toggle('hidden', !isLoading);
    };
    const showError = (message) => {
        errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
        setTimeout(() => { errorContainer.innerHTML = ''; }, 5000);
    };
    const updateTime = () => {
        timeElement.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };


    sidebarToggleBtn.addEventListener('click', () => appContainer.classList.toggle('sidebar-collapsed'));
    newChatBtn.addEventListener('click', startNewChat);
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    sendBtn.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } });
    updateTime();
    setInterval(updateTime, 1000);
    loadConversation(Object.keys(getConversations()).sort((a, b) => b - a)[0]);
});

const canvas = document.getElementById('fluid-canvas');
const ctx = canvas.getContext('2d');
let balls = [];
class Ball {
    constructor(x, y, radius, dx, dy, color) {
        this.x = x; this.y = y; this.radius = radius; this.dx = dx; this.dy = dy; this.color = color;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
    update() {
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) this.dx = -this.dx;
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) this.dy = -this.dy;
        this.x += this.dx;
        this.y += this.dy;
    }
}
function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    balls = [];
    const ballColors = ['#ffffff', '#cccccc', '#999999'];
    const numBalls = Math.floor(window.innerWidth / 100);
    for (let i = 0; i < numBalls; i++) {
        const radius = Math.random() * 80 + 50;
        const x = Math.random() * (canvas.width - radius * 2) + radius;
        const y = Math.random() * (canvas.height - radius * 2) + radius;
        const dx = (Math.random() - 0.5) * 0.5;
        const dy = (Math.random() - 0.5) * 0.5;
        const color = ballColors[Math.floor(Math.random() * ballColors.length)];
        balls.push(new Ball(x, y, radius, dx, dy, color));
    }
}
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });
    requestAnimationFrame(animate);
}
init();
window.addEventListener('resize', init);
animate();