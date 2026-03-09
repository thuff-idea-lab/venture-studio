## 1. Product Overview
The Wix Product Customizer for Engraved Items is a widget designed for boutique gift shop owners using the Wix platform. It addresses the limitations of current Wix tools by enabling complex product customizations, such as multi-layer designs and realistic 3D previews, thereby enhancing customer satisfaction and reducing the likelihood of returns.

## 2. Tech Stack
- **Framework**: Next.js - Chosen for its server-side rendering capabilities, which improve performance and SEO for the widget.
- **Styling**: Tailwind CSS - Provides a utility-first approach for rapid styling and customization without the need for extensive CSS files.
- **Database**: None - The MVP will not require a backend database; all data will be handled in-memory or through local storage.
- **Hosting**: Vercel - Ideal for deploying Next.js applications with automatic scaling and easy integration.
- **Payment processor**: Stripe - A widely-used payment processor that offers a seamless checkout experience and is easy to integrate.
- **Any external APIs or data sources**: No external API integrations required for V1.

## 3. Data Model
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  materials: Material[];
  customizations: Customization[];
}

interface Material {
  id: string;
  name: string;
  texture: string; // URL to texture image
  priceModifier: number; // Additional cost for this material
}

interface Customization {
  id: string;
  type: 'text' | 'image' | 'layer';
  value: string; // Text or image URL
  position: { x: number; y: number }; // Position on the product
}
```

## 4. Page/Route Map
- **Path**: `/`
  - **Purpose**: Home page showcasing the product customizer.
  - **Key components**: Product display, customization options, 3D preview, and checkout button.

- **Path**: `/checkout`
  - **Purpose**: Checkout page for processing payments.
  - **Key components**: Order summary, payment form, confirmation button.

## 5. Core User Flows
1. **User action**: User selects a product and customizes it.
   - **System response**: The system updates the 3D preview based on user selections.
   - **What the user sees**: A dynamic 3D model reflecting the selected customizations.

2. **User action**: User clicks the checkout button.
   - **System response**: The system navigates to the checkout page.
   - **What the user sees**: A summary of their customizations and a payment form.

3. **User action**: User submits payment information.
   - **System response**: The system processes the payment via Stripe.
   - **What the user sees**: A confirmation message or an error if the payment fails (e.g., "Payment declined. Please try again.").

## 6. API/Integration Contracts
No external API integrations required for V1.

## 7. Monetization Integration
- **What is free vs. paid?**: The widget will be free for a trial period to validate demand. After the trial, a one-time purchase of $99 will be required.
- **Where does the paywall/checkout appear in the user flow?**: The paywall appears on the `/checkout` page after the user customizes their product.
- **What payment provider and integration approach?**: Stripe will be used for payment processing, integrated via their JavaScript SDK for a seamless experience.
- **What happens after payment**: Upon successful payment, the user will receive a confirmation email and be redirected to a download page for the widget.

## 8. Data Seeding
No seeding needed; users will bring their own data for customization.

## 9. File Structure
```
project-root/
  src/
    app/         — pages and routes
      index.tsx  — Home page
      checkout.tsx — Checkout page
    components/  — reusable UI components
      ProductDisplay.tsx
      CustomizationOptions.tsx
      CheckoutForm.tsx
    lib/         — utilities and helpers
      payment.ts  — Stripe payment integration
      preview.ts  — 3D preview rendering logic
```

## 10. V1 Scope Boundary
**BUILD (must have for V1):**
- 3D product preview with customization options.
- Material selection with price modifiers.
- Checkout process integrated with Stripe.

**DO NOT BUILD (explicitly out of scope):**
- User accounts — user data will not be stored for V1 to simplify the MVP.
- Advanced analytics — tracking user behavior will be excluded to focus on core functionality.