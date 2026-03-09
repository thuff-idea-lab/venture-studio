## 1. Product Overview
The Cocktail Menu Builder is a web application designed for bar managers to create and customize cocktail menus based on available ingredients and tools. It addresses the problem of inconsistent drink quality and customer dissatisfaction by providing an intuitive interface for menu creation, recipe suggestions, and presentation tips.

## 2. Tech Stack
- **Framework**: Next.js - Allows for server-side rendering and static site generation, which is beneficial for SEO and performance.
- **Styling**: Tailwind CSS - Provides a utility-first approach to styling, enabling rapid UI development and customization.
- **Database**: Supabase - A scalable backend-as-a-service that provides a PostgreSQL database, real-time capabilities, and easy integration with Next.js.
- **Hosting**: Vercel - Optimized for Next.js applications, offering easy deployment and automatic scaling.
- **Payment processor**: Stripe - A widely-used payment processor that supports one-time purchases and is easy to integrate with web applications.
- **External APIs**: No external API integrations required for V1.

## 3. Data Model
```typescript
interface Ingredient {
  id: string;
  name: string;
  type: 'spirit' | 'mixer' | 'garnish' | 'tool';
}

interface Cocktail {
  id: string;
  name: string;
  ingredients: Ingredient[];
  instructions: string;
  presentationTips: string;
}

interface Menu {
  id: string;
  title: string;
  cocktails: Cocktail[];
  createdAt: Date;
  updatedAt: Date;
}
```

## 4. Page/Route Map
- **Path**: `/`
  - **Purpose**: Homepage showcasing the app's features.
  - **Key components**: Hero section, feature highlights, call-to-action button.
  
- **Path**: `/menu`
  - **Purpose**: Create and customize cocktail menus.
  - **Key components**: Menu title input, cocktail list, ingredient selection, recipe suggestions.

- **Path**: `/cocktail/:id`
  - **Purpose**: View and edit a specific cocktail's details.
  - **Key components**: Cocktail name input, ingredient selection, instructions input, presentation tips input.

- **Path**: `/checkout`
  - **Purpose**: Process payment for the customizable cocktail menu template.
  - **Key components**: Payment form, order summary, confirmation button.

## 5. Core User Flows
1. **Creating a New Menu**
   - User action: Clicks "Create New Menu" on the homepage.
   - System response: Redirects to the menu creation page.
   - What the user sees: A blank menu with fields to enter the title and add cocktails.

2. **Adding a Cocktail**
   - User action: Clicks "Add Cocktail" button.
   - System response: Displays a form to input cocktail details.
   - What the user sees: Fields for cocktail name, ingredient selection, instructions, and presentation tips.

3. **Checking Out**
   - User action: Clicks "Checkout" on the menu page.
   - System response: Redirects to the checkout page.
   - What the user sees: Payment form and order summary.
   - Edge case: If payment fails, display an error message and prompt to retry.

## 6. API/Integration Contracts
No external API integrations required for V1.

## 7. Monetization Integration
- **What is free vs. paid?**: The app is free to use for creating and customizing menus. The paid feature is a downloadable customizable cocktail menu template.
- **Where does the paywall/checkout appear in the user flow?**: The checkout page appears after the user clicks "Checkout" on the menu page.
- **What payment provider and integration approach?**: Stripe will be used for payment processing, integrated via their JavaScript library.
- **What happens after payment?**: After payment, the user receives a confirmation message and a link to download the customizable cocktail menu template.

## 8. Data Seeding
- **What specific data is needed?**: A set of sample cocktails and ingredients to demonstrate the app's functionality.
- **Where does it come from?**: Manually curated list based on popular cocktails.
- **Exact format/schema of the seed data**: 
  - Ingredients: [{ id: '1', name: 'Gin', type: 'spirit' }, ...]
  - Cocktails: [{ id: '1', name: 'Gin and Tonic', ingredients: [...], instructions: 'Mix...', presentationTips: 'Serve with lime.' }, ...]
- **How much is needed for a credible V1?**: At least 10 sample cocktails and 20 ingredients.

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
- User can create and customize cocktail menus.
- User can add and edit cocktails with ingredients and instructions.
- User can view and download a customizable cocktail menu template.
- Payment processing for the template.

**DO NOT BUILD (explicitly out of scope):**
- User authentication — to keep the MVP simple and focused on core functionality.
- User accounts and data persistence — initial version will not save user data; all data will be session-based.
- Advanced analytics or reporting features — these can be considered for future iterations based on user feedback.