# SmartCart AI 🛒

### Shop Smarter. Spend Better. Choose with AI.

SmartCart AI is an AI-powered conversational shopping assistant that helps users discover products, compare prices, and receive personalized recommendations based on their requirements, preferences, and budget.

## 🚀 Features

- Conversational AI shopping assistant.
- AI-powered product discovery.
- Natural-language product search.
- Product price comparison.
- Personalized product recommendations.
- Image-based product discovery.
- User authentication and shopping history.
- PayPal-powered subscription checkout.

## 🧠 AI Integration

**Google Gemini API – Gemini 2.5 Flash**

Gemini powers our conversational shopping assistant. It understands user requests, extracts product requirements, interprets preferences, and generates relevant shopping recommendations. It also supports image-based product discovery.

**Serper API**

Serper retrieves relevant product listings and shopping information from online sources, helping SmartCart AI discover and compare available offers.

## 💳 PayPal Integration

SmartCart AI integrates the PayPal Developer Platform using the PayPal Sandbox environment.

- **PayPal Orders API:** Creates and captures payment orders.
- **PayPal Checkout:** Provides the checkout experience.
- **PayPal Sandbox:** Allows payment workflow testing using test accounts.

The application supports one-time payments for upgrading to the Super subscription plan.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Web application and backend API routes |
| React | User interface |
| TypeScript | Application development |
| Google Gemini | Conversational AI |
| Serper API | Product discovery |
| Supabase | Database |
| Clerk | Authentication |
| PayPal Developer API | Payments |

## ⚙️ Installation and Setup

### Prerequisites

- Node.js
- npm
- Git
- Google Gemini API key
- Serper API key
- Supabase project credentials
- Clerk credentials
- PayPal Sandbox credentials

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd my-smart-cart
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root.

Add the environment variables required by your application:

```env
GEMINI_API_KEY=your_gemini_api_key
SERPER_API_KEY=your_serper_api_key

PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_ENV=sandbox
```

Also configure your Supabase and Clerk environment variables according to the project configuration.

**Never publish your API keys or `.env.local` file.**

### 4. Start the development server

```bash
npm run dev
```

Open:

http://localhost:3000

## 🧪 Payment Testing

SmartCart AI uses the PayPal Sandbox environment for testing payment workflows.

Use PayPal Sandbox buyer and merchant accounts to test checkout without making real payments.

## 👥 Team SmartCart AI

- Abeer Warsi – Backend & AI
- Rayan – Backend & AI
- Mohd Abu Ayaan – Frontend
- Pawan – Frontend
- Qamar – Data Collection
- Zayed – Data Collection

## 📌 Project Vision

Our vision is to make online shopping smarter, faster, and more personalized through artificial intelligence and seamless digital payments.

## 📄 License

This project is licensed under the MIT License.