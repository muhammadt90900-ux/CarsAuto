# 🚗 Cars-Auto

**Cars-Auto** is a next-generation, multi-country automotive marketplace built for Iraq, UAE, and China.  
It connects car buyers and sellers, dealers, and service providers in a premium, app-like experience with AI-powered features, real-time chat, and comprehensive payment support.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## ✨ Features

### 🌍 Multi-Country & Multi-Region
- **Iraq**, **UAE**, **China** with full location hierarchy: Country → City → District → Area.
- Dynamic cascading location selectors.

### 🌐 Multi-Language (i18n)
- Kurdish Sorani (RTL), Arabic (RTL), English (LTR).
- Professional translation structure with JSON files.
- Automatic RTL/LTR layout switching.

### 💱 Multi-Currency
- IQD, AED, CNY, USD.
- Real-time exchange rate integration.
- Auto-conversion and localized formatting.

### 👥 Role-Based Access Control
- **Admin**, **Dealer/Seller**, **Buyer**.
- Buyers can browse, chat, save favorites, and make offers.
- Sellers have rich profiles, showrooms, verification badges, ratings, and follower systems.

### 🏷️ Comprehensive Listings
- Cars, Motorcycles, Spare Parts, Accessories, and Services.
- Premium image galleries with drag & drop.
- Video upload, 360° viewer support, AI image optimization.
- Condition, brand, model, year, mileage, fuel type, transmission, and more.
- Featured/urgent badges, SEO slugs, share buttons, and view counters.

### 💬 Real-Time Chat & Communication
- Buyer ↔ Seller messaging with typing indicators, read receipts, image & voice notes.
- Online status and push notifications.

### 🤖 AI-Powered Features
- Smart semantic search using OpenAI embeddings.
- Price suggestions based on market data.
- Spam detection and AI-assisted translation.

### 💳 Payments & Subscriptions
- **Iraq:** FastPay, ZainCash, QiCard, AsiaHawala.
- **Global:** Stripe, PayPal, Apple Pay, Google Pay.
- Seller subscription plans, featured ads, invoice generation, transaction history.

### 🛡️ Enterprise Admin Panel
- User management, listing moderation, revenue dashboard, analytics.
- Payment reconciliation, reports, and CMS.

### 📱 App-Like Experience
- PWA with offline support and install prompts.
- Push notifications, mobile gestures, native-like transitions.
- Glassmorphism UI, dark/light mode, skeleton loading, Framer Motion animations.

---

## 🧱 Tech Stack

| Layer            | Technology                                      |
|------------------|-------------------------------------------------|
| Frontend         | Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/ui, Framer Motion |
| State Management | Zustand, TanStack Query                         |
| Backend          | NestJS, Prisma ORM, PostgreSQL, Redis           |
| Real-time        | Socket.io                                       |
| Payments         | Stripe, custom gateways (FastPay, ZainCash, etc.) |
| AI               | OpenAI (embeddings, moderation, translation)    |
| Storage          | Cloudinary (images, videos, audio)              |
| DevOps           | Docker, Turborepo, GitHub Actions (CI/CD)       |

---

## 📁 Monorepo Structure
