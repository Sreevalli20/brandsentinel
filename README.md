# BrandSentinel AI

Every Message. On Brand. Every Time.

Production-oriented brand protection, deterministic guideline rules engine, verified facts library, and pre-publication compliance auditing.

## 🌐 Live Demo

https://brandsentinel-ai.vercel.app

## 📖 Project Overview

BrandSentinel AI is a comprehensive brand compliance and content review platform that helps organizations maintain brand consistency across all communications. It features:

- **Content Inspector**: Upload and review documents (PDF, DOCX) for brand compliance
- **Brand Guidelines**: Define and manage brand rules and terminology
- **Approved Facts**: Maintain a library of verified facts and claims
- **Approval Workflow**: Multi-stage content approval process
- **Audit History**: Track all changes and compliance actions
- **Reports**: Generate compliance reports and analytics

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Sreevalli20/brandsentinel.git
   cd brandsentinel
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env.local` and configure your API keys:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and set:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `APP_URL`: Your application URL (e.g., `http://localhost:3000`)

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run TypeScript type checking
- `npm run test` - Run tests
- `npm run clean` - Clean build artifacts

## 📦 Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Build Tool**: Vite 8
- **Testing**: Vitest
- **AI Integration**: Google Gemini API
- **Document Processing**: mammoth (DOCX), pdfjs-dist (PDF)

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

## 📝 License

Apache-2.0

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**GitHub Repository**: https://github.com/Sreevalli20/brandsentinel.git
