# Software Requirements Specification (SRS)

## LeafFlow plants sales — MERN Stack Application

| Field        | Detail                             |
| ------------ | ---------------------------------- |
| Version      | 1.0.0                              |
| Date         | May 19, 2026                       |
| Status       | processing                         |
| Stack        | MongoDB, Express, React, Node.js   |
| Architecture | Monorepo — Backend + Frontend Apps |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Architecture](#3-system-architecture)
4. [Functional Requirements — Buyer App](#4-functional-requirements--buyer-app)
5. [Functional Requirements — Admin App](#5-functional-requirements--admin-app)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Tech Stack & Package Versions](#7-tech-stack--package-versions)
8. [Testing Strategy](#8-testing-strategy)
9. [Project Structure](#9-project-structure)
10. [Data Models](#10-data-models)
11. [API Overview](#11-api-overview)
12. [Security Requirements](#12-security-requirements)
13. [File Storage Strategy](#13-file-storage-strategy)
14. [Payment Flow](#14-payment-flow)
15. [Authentication Flow](#15-authentication-flow)
16. [Constraints & Assumptions](#16-constraints--assumptions)

---

## 1. Introduction

### 1.1 Purpose

### 1.2 Scope

### 1.3 Intended Audience

### 1.4 Definitions

---

## 2. Overall Description

### 2.1 Product Perspective

### 2.2 Product Functions (Summary)

### 2.3 User Classes

### 2.4 Operating Environment

---

## 3. System Architecture

### 3.1 Architecture Overview

### 3.2 Monorepo Structure

```
LeafFlow/
├── backend/                  # Express API (shared by both apps)
├── buyer-app/                # React app for customers
├── admin-app/                # React app for admin/seller
├── e2e/                      # Playwright end-to-end tests
└── docs/                     # Project documentation
    └── SRS.md
```

---

## 4. Functional Requirements

---

## 6. Non-Functional Requirements

### 6.1 Performance

### 6.2 Scalability

### 6.3 Reliability

### 6.4 Maintainability

- All environment-specific configuration via `.env` files
- TypeScript is used across backend and frontend apps
- ESLint + Prettier enforced across all packages
- Code coverage target: minimum 70% for backend routes, 60% for frontend components

### 6.5 Accessibility

### 6.6 Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari 16+
- Edge (latest 2 versions)
- Mobile: iOS Safari, Android Chrome

---

## 7. Tech Stack & Package Versions

### 7.1 Runtime & Core

| Technology | Version         | Notes                                        |
| ---------- | --------------- | -------------------------------------------- |
| Node.js    | v24.x (Krypton) | Active LTS — production recommended          |
| React      | v19.2.3         | Latest patched stable (CVE-2025-55182 fixed) |
| TypeScript | v5.x            | Used across all apps                         |
| MongoDB    | 8.2.x           | Latest stable (Mar 2026)                     |

### 7.2 Backend Packages

| Package | Version | Purpose |
| ------- | ------- | ------- |

### 7.3 Frontend Packages (Buyer App & Admin App)

| Package | Version | Purpose |
| ------- | ------- | ------- |

---

## 8. Testing Strategy

### 8.1 Testing Layers

| Layer            | Tools                             | Scope                                                             |
| ---------------- | --------------------------------- | ----------------------------------------------------------------- |
| Unit / Component | Vitest v4 + React Testing Library | Components, Redux slices, utility functions                       |
| API Integration  | Vitest v4 + Supertest v7.2.2      | Every Express route, auth middleware, webhook verification        |
| API Mocking      | MSW (Mock Service Worker) v2      | Intercepts network requests in frontend tests without real server |
| End-to-End       | Playwright v1.x                   | Critical user journeys across real browsers                       |

### 8.2 Frontend Testing Packages

| Package                       | Version | Purpose                                                       |
| ----------------------------- | ------- | ------------------------------------------------------------- |
| `vitest`                      | v4.x    | Test runner (Vite-native, 2–10x faster than Jest, native ESM) |
| `@vitest/coverage-v8`         | v4.x    | Code coverage reports                                         |
| `@vitest/ui`                  | v4.x    | Visual test dashboard                                         |
| `@testing-library/react`      | v16.x   | Component rendering and querying                              |
| `@testing-library/user-event` | v14.x   | Simulating real user interactions                             |
| `@testing-library/jest-dom`   | v6.x    | Custom DOM matchers                                           |
| `happy-dom`                   | v15.x   | DOM environment (2–3x faster than jsdom, pure ESM)            |
| `msw`                         | v2.x    | Network-level API mocking                                     |

### 8.3 Backend Testing Packages

| Package     | Version | Purpose                                                |
| ----------- | ------- | ------------------------------------------------------ |
| `vitest`    | v4.x    | Test runner (also works for Node.js backends)          |
| `supertest` | v7.2.2  | HTTP integration testing for Express routes            |
| `msw`       | v2.x    | Mock external services (Razorpay, R2) in backend tests |

### 8.4 E2E Testing Package

| Package            | Version       | Notes                                                                                                                                                                                 |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@playwright/test` | v1.x (latest) | 45% market adoption in 2026. 3x faster than Cypress. Free built-in parallel sharding. Supports Safari/WebKit. Required for Google OAuth multi-origin flow and Razorpay popup testing. |

### 8.5 Coverage Targets

| App                                        | Target Coverage |
| ------------------------------------------ | --------------- |
| Backend routes                             | ≥ 70%           |
| Backend services (payment, storage, email) | ≥ 80%           |
| Frontend components                        | ≥ 60%           |
| Frontend Redux slices                      | ≥ 85%           |

### 8.6 Critical E2E Scenarios

---

## 9. Project Structure

---

## 10. Data Models

---

## 11. API Overview

## 12. Security Requirements

---

## 13. File Storage Strategy

## 14. Payment Flow

---

## 15. Authentication Flow


---

## 16. Constraints & Assumptions

---

_End of SRS Document — Version 1.0.0_
