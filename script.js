/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

// Conversation history for context (LEVEL UP FEATURE: Maintain Conversation History)
let conversationHistory = [];
let userName = "";

// System prompt for L'Oréal chatbot - ensures AI relevance
const systemPrompt = `You are L'Oréal's AI Beauty Advisor, an expert assistant specializing in L'Oréal's extensive range of beauty products. Your role is to help users discover and understand L'Oréal products across four main categories:

1. MAKEUP: Foundations, concealers, lipsticks, mascara, eyeshadow, blush, etc.
2. SKINCARE: Cleansers, moisturizers, serums, anti-aging products, sunscreens, etc.
3. HAIRCARE: Shampoos, conditioners, treatments, styling products, hair color, etc.
4. FRAGRANCES: Perfumes and colognes from L'Oréal's fragrance portfolio

Key Guidelines:
- Provide personalized product recommendations based on user needs, skin type, hair type, preferences, and concerns
- Suggest complete beauty routines (morning/evening skincare, makeup looks, haircare regimens)
- Share tips on product application and usage
- Be knowledgeable about L'Oréal's various brands and product lines
- Ask relevant follow-up questions to better understand user needs
- Be friendly, professional, and enthusiastic about beauty
- Remember user preferences and previous conversation context

IMPORTANT: Only discuss L'Oréal products, beauty-related topics, skincare routines, makeup techniques, haircare advice, and fragrance recommendations. Politely redirect any off-topic questions back to beauty and L'Oréal products.

If users ask about competitor products, acknowledge their question but gently guide them toward L'Oréal alternatives that might meet their needs.

Always maintain a warm, helpful, and expert tone that reflects L'Oréal's commitment to beauty innovation and inclusivity.`;

// Initialize conversation with system prompt
conversationHistory.push({
  role: "system",
  content: systemPrompt,
});

/* LEVEL UP FEATURE: Chat Conversation UI - Create message bubble */
function createMessageBubble(content, isUser = false, showHeader = true) {
  const messageContainer = document.createElement("div");
  messageContainer.className = `message-container ${isUser ? "user" : "ai"}`;

  const messageBubble = document.createElement("div");
  messageBubble.className = `message-bubble ${isUser ? "user" : "ai"}`;

  if (showHeader) {
    const messageHeader = document.createElement("div");
    messageHeader.className = "message-header";
    messageHeader.textContent = isUser ? "You" : "L'Oréal AI Advisor";
    messageBubble.appendChild(messageHeader);
  }

  const messageContent = document.createElement("div");
  messageContent.className = "message-content";
  messageContent.textContent = content;
  messageBubble.appendChild(messageContent);

  messageContainer.appendChild(messageBubble);
  return messageContainer;
}

/* Create typing indicator */
function createTypingIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "message-container ai";
  indicator.innerHTML = `
    <div class="typing-indicator show">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  return indicator;
}

/* Clear welcome message */
function clearWelcomeMessage() {
  const welcomeMessage = chatWindow.querySelector(".welcome-message");
  if (welcomeMessage) {
    welcomeMessage.remove();
  }
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  // Clear welcome message on first interaction
  clearWelcomeMessage();

  // LEVEL UP FEATURE: Extract user name if they introduce themselves
  if (
    !userName &&
    (userMessage.toLowerCase().includes("my name is") ||
      userMessage.toLowerCase().includes("i'm ") ||
      userMessage.toLowerCase().includes("i am "))
  ) {
    const nameMatch = userMessage.match(
      /(?:my name is|i'm|i am)\s+([a-zA-Z]+)/i
    );
    if (nameMatch) {
      userName = nameMatch[1];
    }
  }

  // LEVEL UP FEATURE: Display User Question - Add user message to chat
  const userMessageElement = createMessageBubble(userMessage, true);
  chatWindow.appendChild(userMessageElement);

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Clear input and disable send button
  userInput.value = "";
  sendBtn.disabled = true;

  // Show typing indicator
  const typingIndicator = createTypingIndicator();
  chatWindow.appendChild(typingIndicator);

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // CLOUDFLARE WORKER API CALL
    const response = await callAI(conversationHistory);

    // Remove typing indicator
    typingIndicator.remove();

    // Add AI response to chat
    const aiMessageElement = createMessageBubble(response, false);
    chatWindow.appendChild(aiMessageElement);

    // Add AI response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: response,
    });
  } catch (error) {
    console.error("API Error:", error);

    // Remove typing indicator
    typingIndicator.remove();

    // Show detailed error message for debugging
    let errorMessage =
      "I apologize, but I'm having trouble connecting right now. ";
    if (error.message.includes("Failed to fetch")) {
      errorMessage +=
        "Please check your Cloudflare Worker URL and make sure it's deployed correctly.";
    } else if (error.message.includes("API key")) {
      errorMessage +=
        "There seems to be an issue with the API key configuration.";
    } else {
      errorMessage += `Error: ${error.message}`;
    }

    const errorBubble = createMessageBubble(errorMessage, false);
    chatWindow.appendChild(errorBubble);
  }

  // Re-enable send button
  sendBtn.disabled = false;

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Focus back on input
  userInput.focus();
});

/* 🔥 REPLACE "YOUR_CLOUDFLARE_WORKER_URL_HERE" WITH YOUR ACTUAL CLOUDFLARE WORKER URL */
async function callAI(messages) {
  try {
    console.log("Sending request to Cloudflare Worker...");
    console.log("Messages:", messages);

    const response = await fetch(
      "https://chatbot-worker.ftobiolotu.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages,
        }),
      }
    );

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API request failed:", response.status, errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log("Raw response:", responseText);

    if (!responseText.trim()) {
      throw new Error("Empty response from server");
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(`Failed to parse response: ${parseError.message}`);
    }

    console.log("Parsed data:", data);

    // Check for error in response
    if (data.error) {
      throw new Error(`Server error: ${data.error} - ${data.details || ""}`);
    }

    // Check for OpenAI response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Invalid response structure:", data);
      throw new Error("Invalid response structure from AI service");
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("callAI error:", error);
    throw error;
  }
}

// Focus on input when page loads
userInput.focus();

// Handle Enter key in input
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});
