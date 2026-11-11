# SmartCart AI Chatbot UI update

The homepage shopping search has been changed into a conversational chatbot interface.

- Uses the existing `/api/search` endpoint; Gemini and Serper integration remain server-side.
- Keeps image upload, saved shopping needs, search history, usage limits, plan management, and PayPal checkout.
- Shows user messages, assistant responses, a typing indicator, and suggested shopping prompts.
- Product offers are still rendered from the actual API response below the conversation.

This is a shopping-assistant chat UI backed by the existing product-search endpoint. It does not add general-purpose multi-turn Gemini chat or persistent conversation storage. To add those later, implement a dedicated chat API and conversation table.

Run `npm install` and `npm run dev` in the project directory. Keep your own `.env.local` file out of the ZIP and in the project root.
