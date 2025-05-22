# replit.md

## Overview

This is a full-stack web application built with React (frontend) and Express.js (backend) that serves as a business landing page for ARTIVANCE, an AI automation company. The application features a modern design with sections for services, pricing, testimonials, and a contact form. It includes user authentication via Replit Auth and uses PostgreSQL for data storage with Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state
- **Build Tool**: Vite for development and bundling
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Database Provider**: Neon serverless PostgreSQL

### Key Components

#### Authentication System
- Uses Replit's built-in authentication service
- Session-based authentication with secure cookie storage
- User profile management with automatic user creation/updates
- Protected routes for authenticated users only

#### Database Schema
- **Users table**: Stores user profiles (required for Replit Auth)
- **Sessions table**: Handles session storage (required for Replit Auth)
- **Contact submissions table**: Stores contact form submissions

#### UI Components
- Comprehensive component library based on shadcn/ui
- Responsive design with mobile-first approach
- Form handling with validation
- Toast notifications for user feedback
- Modal dialogs and interactive elements

## Data Flow

1. **User Authentication**: Users authenticate via Replit Auth, sessions stored in PostgreSQL
2. **Contact Form**: Form submissions are validated and stored in the database
3. **API Communication**: Frontend communicates with backend via REST API
4. **State Management**: React Query handles server state caching and synchronization

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL database connection
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Database ORM and query builder
- **express**: Web server framework
- **passport**: Authentication middleware

### UI Dependencies
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tsx**: TypeScript execution for Node.js

## Deployment Strategy

### Development Environment
- Uses Vite dev server for frontend hot reloading
- Express server runs with tsx for TypeScript execution
- PostgreSQL database provided by Replit
- Environment variables managed through Replit secrets

### Production Build
- Frontend built with Vite and served as static files
- Backend bundled with esbuild for Node.js
- Static assets served by Express in production
- Database migrations managed with Drizzle Kit

### Configuration
- **Port**: Application runs on port 5000
- **Database**: Uses DATABASE_URL environment variable
- **Sessions**: Requires SESSION_SECRET for secure sessions
- **Auth**: Configured for Replit's authentication system

The application follows a standard full-stack architecture with clear separation between frontend and backend concerns, making it easy to maintain and extend.