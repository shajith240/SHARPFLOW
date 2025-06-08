# SharpFlow - Your Edge in the Lead Game

<div align="center">
  <img src="attached_assets/sharpflow.png" alt="SharpFlow Logo" width="200" height="200">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg)](https://supabase.com/)

[![CI Pipeline](https://github.com/shajith240/SHARPFLOW/actions/workflows/ci.yml/badge.svg)](https://github.com/shajith240/SHARPFLOW/actions/workflows/ci.yml)
[![CD Pipeline](https://github.com/shajith240/SHARPFLOW/actions/workflows/cd.yml/badge.svg)](https://github.com/shajith240/SHARPFLOW/actions/workflows/cd.yml)
[![Security Scan](https://github.com/shajith240/SHARPFLOW/actions/workflows/security.yml/badge.svg)](https://github.com/shajith240/SHARPFLOW/actions/workflows/security.yml)

</div>

## 🚀 Overview

**SharpFlow** is a cutting-edge social media automation platform designed to revolutionize lead generation and customer acquisition. Built with modern web technologies and a focus on scalability, SharpFlow provides businesses with powerful tools to automate their social media presence, generate high-quality leads, and streamline their sales processes.

### ✨ Key Features

- **🔐 Secure Authentication** - Google OAuth integration with session management
- **💳 Payment Processing** - PayPal integration with subscription management
- **🏢 Multi-Tenant Architecture** - Complete data isolation for enterprise clients
- **🤖 Telegram Bot Integration** - Automated lead generation via Telegram bots
- **🔄 n8n Workflow Integration** - Seamless automation workflow management
- **📊 Advanced Analytics** - Comprehensive reporting and lead tracking
- **📱 Responsive Design** - Mobile-first approach with Cursor.com-inspired UI
- **🎨 Professional Branding** - Consistent brand identity with lime green (#C1FF72) and blue (#38B6FF)
- **⚡ Real-time Updates** - WebSocket integration for live data synchronization
- **🔍 Lead Research** - AI-powered lead research and report generation

## 🛠️ Technology Stack

### Frontend

- **React 18** - Modern UI library with hooks and context
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **React Query** - Server state management
- **Wouter** - Lightweight routing solution

### Backend

- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **Passport.js** - Authentication middleware
- **WebSocket** - Real-time communication

### Database & Storage

- **Supabase** - PostgreSQL database with real-time features
- **Drizzle ORM** - Type-safe database operations

### External Integrations

- **PayPal API** - Payment processing and subscription management
- **Google OAuth** - Secure user authentication
- **OpenAI API** - AI-powered lead generation and research
- **Apify** - Web scraping and data extraction

### Development Tools

- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **Git** - Version control
- **npm** - Package management

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Git** for version control
- A **Supabase** account and project
- **PayPal Developer** account for payment processing
- **Google Cloud Console** project for OAuth

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/shajith240/SHARPFLOW.git
cd SHARPFLOW
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

## 🔄 CI/CD Pipeline

SharpFlow includes a comprehensive CI/CD pipeline with GitHub Actions for automated testing, building, and deployment.

### 📋 Pipeline Overview

- **🔄 Continuous Integration** - Automated testing, linting, and build verification
- **🚀 Continuous Deployment** - Automated deployment to staging and production
- **🔒 Security Scanning** - Vulnerability and dependency scanning
- **🏷️ Release Management** - Automated versioning and releases
- **📦 Dependency Updates** - Automated security and dependency updates

### 🛠️ Pipeline Features

- **Multi-tenant testing** - Ensures proper isolation between users
- **Docker containerization** - Consistent deployment across environments
- **Health checks** - Comprehensive application verification
- **Security scanning** - CodeQL, Trivy, and dependency auditing
- **Automated rollbacks** - Safe deployment with rollback capabilities

For detailed CI/CD documentation, see [CI-CD-PIPELINE-GUIDE.md](CI-CD-PIPELINE-GUIDE.md).

Edit the `.env` file with your configuration:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database URL for Drizzle migrations
DATABASE_URL=postgresql://postgres:password@host:5432/postgres

# Session Configuration
SESSION_SECRET=your_secure_session_secret

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# External APIs
OPENAI_API_KEY=your_openai_api_key
APOLLO_API_KEY=your_apollo_api_key
APIFY_API_KEY=your_apify_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
```

### 4. Database Setup

Run the database migrations:

```bash
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📖 Usage Guide

### For End Users

1. **Sign Up/Sign In** - Use Google OAuth to create an account
2. **Choose a Plan** - Select from Starter, Professional, or Ultra plans
3. **Configure Bot** - Set up your Telegram bot for lead generation
4. **Create Workflows** - Design automation workflows using n8n integration
5. **Monitor Leads** - Track and manage generated leads through the dashboard
6. **Generate Reports** - Create detailed research reports for your leads

### For Developers

#### Project Structure

```
SHARPFLOW/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript type definitions
├── server/                # Backend Node.js application
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   ├── webhooks/         # Webhook handlers
│   └── utils/            # Server utilities
├── shared/               # Shared code between client and server
└── database-setup/       # Database migration scripts
```

#### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Database
npm run db:migrate      # Run database migrations
npm run db:studio       # Open Drizzle Studio

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript compiler check
```

## 🔌 API Documentation

### Authentication Endpoints

- `GET /api/auth/user` - Get current user information
- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/google/callback` - Handle OAuth callback
- `POST /api/auth/logout` - Logout user

### Lead Management

- `GET /api/leads` - Fetch user leads with pagination
- `GET /api/leads/stats` - Get lead statistics
- `POST /api/leads/generate` - Generate new leads
- `DELETE /api/leads/:id` - Delete a lead

### Payment Processing

- `GET /api/payments/plans` - Get available subscription plans
- `POST /api/payments/create-subscription` - Create PayPal subscription
- `GET /api/payments/subscription` - Get current subscription status

### Bot Management

- `GET /api/multi-bot/config` - Get bot configuration
- `POST /api/multi-bot/test` - Test bot connection
- `GET /api/multi-bot/stats` - Get bot statistics

## 🤝 Contributing

We welcome contributions to SharpFlow! Please follow these guidelines:

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

### Reporting Issues

Please use the GitHub Issues tab to report bugs or request features. Include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cursor.com** - Design inspiration for the professional dark theme
- **Supabase** - Excellent backend-as-a-service platform
- **Vercel** - Deployment and hosting solutions
- **Open Source Community** - For the amazing tools and libraries

## 📞 Support

For support, email support@sharpflow.com or join our community discussions.

---

<div align="center">
  <p>Built with ❤️ by the SharpFlow Team</p>
  <p>© 2024 SharpFlow. All rights reserved.</p>
</div>
