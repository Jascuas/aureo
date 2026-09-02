# Aureo Finance Platform

> **A modern, production-ready personal finance management SaaS built with Next.js 15, Hono, and PostgreSQL.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Status](#project-status)
5. [Getting Started](#getting-started)
6. [Architecture](#architecture)
7. [Development](#development)
8. [Roadmap](#roadmap)
9. [Contributing](#contributing)

---

## 🎯 Overview

Aureo is a full-stack personal finance platform designed for individuals who want complete control over their financial data. Built with modern technologies and best practices, it provides real-time insights, hierarchical categorization, and seamless transaction management.

**Project Origin**: Based on the "Code With Antonio" tutorial, extensively refactored and enhanced with production-grade patterns, comprehensive documentation, and architectural improvements.

## ✨ Features

### Core Functionality (✅ Implemented)

- 📊 **Interactive Dashboard** - Real-time financial overview with customizable charts
- 💳 **Multi-Account Management** - Track multiple bank accounts and credit cards
- 🏷️ **Hierarchical Categories** - Parent/child category support with circular reference prevention
- 💸 **Transaction Management** - Full CRUD with type classification (Income/Expense/Refund)
- 📁 **CSV Import** - Bulk transaction import from bank statements
- 🗓️ **Advanced Filters** - Date range, account, and category filtering
- 📈 **Summary Reports** - Overview, over-time, and by-category analytics
- 🔍 **Search & Bulk Operations** - Find and manage multiple transactions at once
- 🔐 **Secure Authentication** - Clerk-based auth with role-based access

### Technical Highlights

- ⚡ **Type-Safe API** - Hono.js with full TypeScript inference
- 🎯 **4-Layer Validation** - Zod schemas + Clerk auth + RLS + FK constraints
- 🔄 **Smart State Management** - React Query with optimized invalidation patterns
- 🎨 **Modern UI** - Tailwind CSS + shadcn/ui components
- 📱 **Responsive Design** - Mobile-first approach with adaptive layouts
- 🛡️ **Production-Ready** - Comprehensive error handling and data integrity

### Coming Soon (🚧 See [ROADMAP.md](ROADMAP.md))

- 🔗 **Plaid Integration** - Automatic bank account sync
- 💰 **Budgets & Alerts** - Set spending limits with notifications
- 🔄 **Recurring Transactions** - Automated monthly/weekly transactions
- 🌍 **Multi-Currency** - Support for international accounts
- 📄 **Export Reports** - PDF/Excel financial statements
- 🤖 **AI Categorization** - Smart transaction categorization

## 🛠️ Tech Stack

### Frontend

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - Accessible component library
- **[Recharts](https://recharts.org/)** - Data visualization
- **[Tanstack React Query](https://tanstack.com/query)** - Server state management
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Client state (UI-only)
- **[React Hook Form](https://react-hook-form.com/)** - Form handling
- **[Zod](https://zod.dev/)** - Schema validation

### Backend

- **[Hono.js](https://hono.dev/)** - Lightweight API framework
- **[Clerk](https://clerk.com/)** - Authentication & user management
- **[Drizzle ORM](https://orm.drizzle.team/)** - Type-safe database queries
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[Neon](https://neon.tech/)** - Serverless Postgres hosting

### Development Tools

- **[ESLint](https://eslint.org/)** - Code linting
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)** - Database migrations
- **[date-fns](https://date-fns.org/)** - Date utilities

### Deployment

- **[Vercel](https://vercel.com/)** - Hosting & CI/CD

## Project Setup

Follow these steps to set up the project locally:

**Clone the repository**:

````bash
git clone https://github.com/JosueIsOffline/finance-saas-platform.git
cd finance-saas-platform

## Getting Started
First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev

````
