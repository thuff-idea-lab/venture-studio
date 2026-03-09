## 1. Product Overview
The Website Migration Tool for Webflow Users is a SaaS application designed for freelance web developers specializing in Webflow migrations. It automates the tedious process of cleaning and structuring messy content from clients' websites, significantly reducing the time and effort required for migration to Webflow.

## 2. Tech Stack
- **Framework:** Next.js - Chosen for its server-side rendering capabilities and ease of building dynamic web applications.
- **Styling:** Tailwind CSS - Provides a utility-first approach for rapid UI development and responsive design.
- **Database:** Supabase - A scalable backend solution that offers real-time capabilities and is easy to integrate with Next.js.
- **Hosting:** Vercel - Optimized for Next.js applications, offering seamless deployment and performance.
- **Payment processor:** Stripe - A widely used payment processor that provides a robust API for handling transactions.
- **External APIs:** No external API integrations required for V1.

## 3. Data Model
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

interface MigrationProject {
  id: string;
  userId: string;
  content: string; // Raw content uploaded by the user
  structuredContent: string; // Cleaned and structured output
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

interface Payment {
  id: string;
  userId: string;
  projectId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}
```

## 4. Page/Route Map
- **Path:** `/`
  - **Purpose:** Landing page introducing the tool and its benefits.
  - **Key components:** Hero section, features overview, call-to-action button.

- **Path:** `/upload`
  - **Purpose:** Page for users to upload messy content for migration.
  - **Key components:** File upload input, submit button, progress indicator.

- **Path:** `/projects`
  - **Purpose:** Dashboard for users to view and manage their migration projects.
  - **Key components:** List of projects, status indicators, action buttons.

- **Path:** `/checkout`
  - **Purpose:** Payment page for processing migration project fees.
  - **Key components:** Payment form, summary of charges, confirmation button.

- **Path:** `/success`
  - **Purpose:** Confirmation page after successful payment and project completion.
  - **Key components:** Success message, project summary, download link.

## 5. Core User Flows
1. **User uploads content**
   - User action: User selects a file and clicks "Submit".
   - System response: Content is processed, and a migration project is created.
   - What the user sees: A loading indicator followed by a success message and a link to the project dashboard.

2. **User views project status**
   - User action: User navigates to the `/projects` page.
   - System response: Fetches and displays a list of the user's migration projects.
   - What the user sees: A list with project names, statuses, and action buttons.

3. **User makes a payment**
   - User action: User clicks "Checkout" on a project.
   - System response: Redirects to the `/checkout` page with payment details.
   - What the user sees: Payment form with project details and total amount.

4. **Payment failure**
   - User action: User submits payment details.
   - System response: Payment processor returns an error.
   - What the user sees: An error message prompting the user to try again.

## 6. API/Integration Contracts
No external API integrations required for V1.

## 7. Monetization Integration
- **What is free vs. paid?** Users can upload content and receive structured output for free during the V1 phase. Future versions will charge $200 per migration project processed.
- **Where does the paywall/checkout appear in the user flow?** The paywall appears on the `/checkout` page after the user submits their project for processing.
- **Payment provider and integration approach:** Stripe will be integrated using their API for processing payments.
- **What happens after payment?** After successful payment, users will be redirected to the `/success` page, where they can download their structured content.

## 8. Data Seeding
No seeding needed; users will bring their own data for migration.

## 9. File Structure
```
project-root/
  src/
    app/         — pages and routes
    components/  — reusable UI components
    lib/         — utilities and helpers
    styles/      — global styles and Tailwind configuration
    types/       — TypeScript interfaces and types
```

## 10. V1 Scope Boundary
**BUILD (must have for V1):**
- User registration and authentication
- File upload functionality for messy content
- Automated content structuring process
- Project dashboard to view migration status
- Payment processing via Stripe
- Success page for completed projects

**DO NOT BUILD (explicitly out of scope):**
- User roles and permissions — complexity not needed for V1.
- Advanced analytics or reporting features — focus on core functionality first.
- Content preview or editing capabilities — initial version will only process uploads.