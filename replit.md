# Clínica Basile - Financial Control System

## Overview

This is a full-stack financial management application for Clínica Basile, a medical clinic. The system allows staff to record, track, and manage financial entries for different medical procedures across multiple specialties (plastic surgery, dermatology, physiotherapy). It provides a dashboard for viewing daily summaries, filtering entries by doctor or date, and exporting data to CSV format.

The application uses a modern tech stack with React for the frontend, Express for the backend API, and PostgreSQL with Drizzle ORM for data persistence. The UI is built with shadcn/ui components and Tailwind CSS for styling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React SPA**: Single-page application using React 18 with TypeScript
- **Routing**: Wouter for client-side routing (lightweight React Router alternative)
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Express Server**: RESTful API server with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod schemas shared between client and server
- **Development**: Hot module replacement with Vite integration
- **Storage Pattern**: Interface-based storage abstraction (IStorage) with in-memory implementation for development

### Database Design
- **Financial Entries Table**: Core entity storing patient information, procedures, payment details, and audit fields
- **Users Table**: Basic user management (prepared but not fully implemented)
- **PostgreSQL**: Production database with Neon serverless hosting
- **Migration System**: Drizzle Kit for schema migrations

### API Structure
- **RESTful Endpoints**: Standard HTTP methods for CRUD operations
- **Route Structure**: 
  - `POST /api/financial-entries` - Create new entry
  - `GET /api/financial-entries` - List entries with filtering
  - `GET /api/financial-entries/:id` - Get single entry
  - `GET /api/daily-summary` - Aggregated daily statistics
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Request Logging**: Automatic API request/response logging for debugging

### Key Features
- **Multi-Doctor Support**: Predefined procedure lists and values for different doctors
- **Payment Processing**: Support for different payment methods and installment plans
- **Data Export**: CSV export functionality with proper formatting
- **Real-time Updates**: Automatic cache invalidation after mutations
- **Responsive Design**: Mobile-first responsive layout

### Development Workflow
- **Monorepo Structure**: Client, server, and shared code in single repository
- **Shared Types**: Common schemas and types between frontend and backend
- **Path Aliases**: Clean imports using TypeScript path mapping
- **Development Server**: Integrated Vite dev server with Express API proxy

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL hosting platform
- **Connection**: Uses `@neondatabase/serverless` adapter for optimal serverless performance

### UI Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework with custom design system

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **TanStack Query**: Powerful data synchronization for React
- **React Hook Form**: Performant forms with minimal re-renders
- **date-fns**: Modern JavaScript date utility library

### Build & Deployment
- **Vite**: Fast build tool with HMR support
- **TypeScript**: Full type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Integration**: Special plugins for Replit development environment