
import { GoogleGenAI } from "@google/genai";

// --- Constants & Config ---
const MCARS_SYSTEM_PROMPT = `
You are the official AI Sales and Customer Support Assistant for MCARS PH (shop.mcars.ph), an online automotive shop based in the Philippines.

**Website Context:**
- MCARS PH sells car parts (engine parts, suspension, brakes), accessories (lighting, interior, exterior trim), and general automotive products.
- Target audience: Car enthusiasts and vehicle owners in the Philippines.

**Behavior Rules:**
1. **Be clear, concise, and helpful.**
2. **Product Knowledge:** If asked about compatibility, ask for the car's Make (e.g., Toyota), Model (e.g., Vios), and Year (e.g., 2018).
3. **No Hallucinations:** Do NOT invent prices, specific stock levels, or active promotions. If asked, tell the user that prices vary and suggest they check the website (shop.mcars.ph) for the most accurate and real-time pricing.
4. **No Legal/Financial Advice:** Redirect any such queries to the appropriate authorities.
5. **Tone:** Professional yet friendly, helpful, and customer-focused. Use conversational English typical of the Philippines (Taglish is acceptable if the user initiates it, but keep it mostly English).
6. **Delivery:** General info: We ship nationwide. Metro Manila usually takes 1-3 business days. Provincial areas 3-7 business days.
7. **Redirection:** If a query is too technical or requires human intervention (e.g., order tracking or returns), politely provide our support channels (Email: support@mcars.ph or Message us on Facebook at MCARS PH).

**Style Guidelines:**
- Address users politely ("Sure!", "I can help with that.").
- Use simple explanations.
- Only use emojis if the user uses them first.
`;

const QUICK_ACTIONS = [
  { label: "Compatibility", query: "I want to check if a part is compatible with my car." },
  { label: "Delivery", query: "How long does shipping take within the Philippines?" },
  { label: "Returns", query: "What is your return and warranty policy?" }
];

// --- State & Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
let chatSession = ai.chats.create({
  model: 'gemini-3-flash-preview',
  config: {
    systemInstruction: MCARS_SYSTEM_PROMPT,
    temperature: 0.7,
  },
});

const messageList = document.getElementById('message-list');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const resetBtn = document.getElementById('reset-btn');
const quickActionsContainer = document.getElementById('quick-actions-container');
const quickActionsWrapper = document.getElementById('quick-actions');
const chatToggle = document.getElementById('chat-toggle');
const chatWindow = document.getElementById('chat-window');
const toggleIconOpen = document.getElementById('toggle-icon-open');
const toggleIconClose = document.getElementById('toggle-icon-close');
const chatBadge = document.getElementById('chat-badge');

let isTyping = false;
let isInitialized = false;

// --- Helper Functions ---

function createMessageElement(role, content = '') {
  const isAssistant = role === 'assistant';
  const messageDiv = document.createElement('div');
  messageDiv.className = `flex w-full mb-4 ${isAssistant ? 'justify-start' : 'justify-end'}`;
  
  const innerHtml = `
    <div class="flex max-w-[88%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}">
      <div class="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center mt-0.5 shadow-sm
        ${isAssistant ? 'bg-red-600 text-white mr-2' : 'bg-slate-800 text-white ml-2'}">
        <i class="fa-solid ${isAssistant ? 'fa-robot' : 'fa-user'} text-[10px]"></i>
      </div>
      
      <div class="flex flex-col ${isAssistant ? 'items-start' : 'items-end'}">
        <div class="content-bubble px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed
          ${isAssistant 
            ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm' 
            : 'bg-red-600 text-white rounded-tr-none shadow-md'}">
          ${formatContent(content)}
        </div>
        <span class="text-[9px] text-slate-400 mt-1 uppercase font-medium tracking-widest">
          ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  `;
  
  messageDiv.innerHTML = innerHtml;
  return messageDiv;
}

function formatContent(text) {
  if (!text) return '<div class="flex space-x-1 py-1"><div class="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div><div class="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75"></div><div class="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></div></div>';
  return text.split('\n').map(line => 
    line.trim() === '' ? '<div class="h-1.5"></div>' : `<p class="mb-1 last:mb-0">${escapeHtml(line)}</p>`
  ).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  if (messageList) {
    messageList.scrollTop = messageList.scrollHeight;
  }
}

function appendMessage(role, content = '') {
  const el = createMessageElement(role, content);
  if (messageList) {
    messageList.appendChild(el);
    scrollToBottom();
  }
  return el;
}

async function handleSendMessage(text) {
  if (!text.trim() || isTyping) return;

  appendMessage('user', text);
  if (chatInput) chatInput.value = '';
  
  isTyping = true;
  if (sendBtn) sendBtn.disabled = true;
  if (quickActionsWrapper) quickActionsWrapper.classList.add('hidden');

  const assistantEl = appendMessage('assistant', '');
  const bubble = assistantEl.querySelector('.content-bubble');
  let fullText = "";

  try {
    const result = await chatSession.sendMessageStream({ message: text });
    
    for await (const chunk of result) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      if (bubble) bubble.innerHTML = formatContent(fullText);
      scrollToBottom();
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    if (bubble) {
        bubble.innerHTML = formatContent("I apologize, but I'm having trouble connecting right now. Please check shop.mcars.ph for assistance.");
    }
  } finally {
    isTyping = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

// --- Interaction Logic ---

function toggleChat() {
    const isActive = chatWindow.classList.toggle('active');
    toggleIconOpen.classList.toggle('hidden', isActive);
    toggleIconClose.classList.toggle('hidden', !isActive);
    
    if (isActive) {
        chatBadge.classList.add('hidden'); // Hide badge once opened
        if (!isInitialized) {
            appendMessage('assistant', "Hi! I'm the MCARS PH AI Assistant. Looking for specific car parts or have questions about an order? I'm here to help!");
            isInitialized = true;
        }
        setTimeout(() => chatInput.focus(), 300);
    }
}

// --- Event Listeners ---

chatToggle.addEventListener('click', toggleChat);

if (sendBtn) {
    sendBtn.addEventListener('click', () => handleSendMessage(chatInput.value));
}

if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSendMessage(chatInput.value);
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (messageList) messageList.innerHTML = '';
      chatSession = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction: MCARS_SYSTEM_PROMPT },
      });
      appendMessage('assistant', "History cleared. How can I assist you further today?");
      if (quickActionsWrapper) quickActionsWrapper.classList.remove('hidden');
    });
}

// Initialize Quick Actions
if (quickActionsContainer) {
    QUICK_ACTIONS.forEach(action => {
      const btn = document.createElement('button');
      btn.className = "px-3 py-1 rounded-full border border-red-100 bg-red-50 text-red-600 text-[11px] font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm shrink-0";
      btn.textContent = action.label;
      btn.onclick = () => handleSendMessage(action.query);
      quickActionsContainer.appendChild(btn);
    });
}
