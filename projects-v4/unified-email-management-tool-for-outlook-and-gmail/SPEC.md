## 1. Product Overview
The Unified Email Management Tool is a web application designed for freelancers and small business owners who struggle to manage emails from both Outlook and Gmail in a single interface. This tool addresses the inefficiencies and missed communications that arise from juggling multiple email accounts by providing a unified platform for email management, complete with tagging and custom signature functionalities.

## 2. Tech Stack
- **Framework:** Next.js — Chosen for its server-side rendering capabilities, which enhance performance and SEO.
- **Styling:** Tailwind CSS — Provides a utility-first approach for rapid UI development and responsive design.
- **Database:** Supabase — A scalable, open-source backend that integrates easily with Next.js and supports real-time capabilities.
- **Hosting:** Vercel — Optimized for Next.js applications, offering seamless deployment and performance.
- **Payment processor:** Stripe — A widely-used, developer-friendly payment processor that supports subscription models.
- **External APIs:** Gmail API and Microsoft Graph API — Required for integrating with Gmail and Outlook accounts to fetch and manage emails.

## 3. Data Model
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string; // For authentication
  outlookConnected: boolean;
  gmailConnected: boolean;
  createdAt: Date;
}

interface Email {
  id: string;
  userId: string; // Reference to User
  subject: string;
  body: string;
  from: string;
  to: string[];
  receivedAt: Date;
  tags: string[]; // Array of tags for organization
  signatureId: string; // Reference to User's signature
}

interface Signature {
  id: string;
  userId: string; // Reference to User
  content: string; // HTML content of the signature
}
```

## 4. Page/Route Map
- **Path:** `/`
  - **Purpose:** Landing page introducing the tool.
  - **Key components:** Hero section, feature highlights, call-to-action buttons.

- **Path:** `/login`
  - **Purpose:** User login page.
  - **Key components:** Email input, password input, login button, link to registration.

- **Path:** `/register`
  - **Purpose:** User registration page.
  - **Key components:** Email input, password input, confirm password input, register button.

- **Path:** `/dashboard`
  - **Purpose:** Main interface for managing emails.
  - **Key components:** Email list, tagging interface, signature management, account settings.

- **Path:** `/settings`
  - **Purpose:** User settings page for account management.
  - **Key components:** Email connection status, signature management, subscription status.

## 5. Core User Flows
1. **User Registration**
   - User fills out registration form → System creates user account → User sees a confirmation message and is redirected to the login page.
   - Edge case: If email already exists, show an error message.

2. **User Login**
   - User enters credentials → System validates and logs in user → User is redirected to the dashboard.
   - Edge case: If credentials are incorrect, show an error message.

3. **Connecting Email Accounts**
   - User navigates to settings → User clicks on connect buttons for Outlook and Gmail → System initiates OAuth flow → User authorizes access → User sees connected status on the settings page.
   - Edge case: If authorization fails, show an error message.

4. **Managing Emails**
   - User views dashboard → System fetches emails from connected accounts → User can tag emails and manage signatures → Changes are saved in real-time.
   - Edge case: If email fetching fails, show an error message.

## 6. API/Integration Contracts
- **Gmail API**
  - **Endpoint URL pattern:** `https://www.googleapis.com/gmail/v1/users/me/messages`
  - **Authentication method:** OAuth 2.0
  - **Request/response data shapes:** 
    - Request: `{ "userId": "me" }`
    - Response: `{ "messages": [{ "id": string, "threadId": string }] }`
  - **Rate limits:** 1,000,000 requests per day.

- **Microsoft Graph API**
  - **Endpoint URL pattern:** `https://graph.microsoft.com/v1.0/me/messages`
  - **Authentication method:** OAuth 2.0
  - **Request/response data shapes:** 
    - Request: `{ "userId": "me" }`
    - Response: `{ "value": [{ "id": string, "subject": string }] }`
  - **Rate limits:** 10,000 requests per 10 minutes.

## 7. Monetization Integration
- **Free vs. Paid:** The MVP will be free to validate demand, with future paid features including custom signatures and advanced tagging.
- **Paywall/Checkout:** The paywall will appear in the settings page where users can upgrade their account.
- **Payment provider:** Stripe will be integrated for subscription management.
- **Post-payment:** After payment, the user will unlock premium features and be redirected to the dashboard.

## 8. Data Seeding
No seeding needed; users will bring their own data by connecting their email accounts.

## 9. File Structure
```
project-root/
  src/
    app/         — pages and routes
    components/  — reusable UI components
    lib/         — utilities and helpers
    styles/      — global styles and Tailwind configuration
    api/         — API routes for server-side functions
```

## 10. V1 Scope Boundary
**BUILD (must have for V1):**
- User registration and login
- Email account connection (Gmail and Outlook)
- Email fetching and display in the dashboard
- Tagging functionality for emails
- Custom signature management

**DO NOT BUILD (explicitly out of scope):**
- Advanced analytics or reporting features — complexity exceeds the MVP scope.
- Multi-user support — focus on individual users for V1 to simplify development.