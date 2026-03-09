## 1. Product Overview
The One-Time Cookie Consent Banner is a customizable template designed for Webflow users who need a cost-effective solution for cookie consent compliance. This product addresses the issue of ongoing monthly fees associated with cookie consent solutions by providing a one-time purchase option, enabling users to integrate a legally compliant banner into their websites without recurring costs.

## 2. Tech Stack
- **Framework:** Plain HTML and JavaScript — Simple and lightweight for easy integration into Webflow sites.
- **Styling:** CSS (with optional custom styles) — Allows for straightforward customization without the overhead of a CSS framework.
- **Database:** None — The template will not require a database as it is a static solution.
- **Hosting:** N/A — The template will be downloaded and hosted by users on their Webflow sites.
- **Payment processor:** Gumroad — Ideal for digital product sales with a simple one-time payment setup.
- **Any external APIs or data sources:** No external API integrations required for V1.

## 3. Data Model
```typescript
interface CookieConsentBanner {
  id: string;
  message: string;
  acceptButtonText: string;
  declineButtonText: string;
  policyLink: string;
  showOnLoad: boolean;
  createdAt: Date;
}
```

## 4. Page/Route Map
- **Path:** `/`
  - **Purpose:** Main landing page for the cookie consent banner template.
  - **Key components on the page:** Header, product description, customization options, purchase button, footer.

## 5. Core User Flows
1. **User action:** User visits the landing page → **System response:** Display the cookie consent banner template details → **What the user sees:** Product description, customization options, and purchase button.
2. **User action:** User clicks the purchase button → **System response:** Redirect to Gumroad checkout → **What the user sees:** Gumroad payment page.
3. **User action:** User completes payment → **System response:** Send a download link via email → **What the user sees:** Confirmation message and download link in their email.
4. **Edge case:** User fails to complete payment → **System response:** Display an error message → **What the user sees:** Error message on the Gumroad page.

## 6. API/Integration Contracts
No external API integrations required for V1.

## 7. Monetization Integration
- **What is free vs. paid?** The cookie consent banner template is a paid product available for a one-time purchase of $20.
- **Where does the paywall/checkout appear in the user flow?** The paywall appears when the user clicks the purchase button on the landing page, redirecting them to the Gumroad checkout page.
- **What payment provider and integration approach?** Gumroad will handle the payment processing, and the integration will be through a simple redirect to their platform.
- **What happens after payment?** After payment, users receive a confirmation email with a download link for the cookie consent banner template.

## 8. Data Seeding
No seeding needed. Users will bring their own data by customizing the template according to their specific cookie consent requirements.

## 9. File Structure
```
project-root/
  src/
    app/         — landing page and product details
    components/  — reusable UI components (if any)
    lib/         — utilities and helpers (if any)
    assets/      — images and other static assets
```

## 10. V1 Scope Boundary
**BUILD (must have for V1):**
- Customizable cookie consent banner template
- Integration with Gumroad for payment processing
- User documentation for installation and customization

**DO NOT BUILD (explicitly out of scope):**
- User authentication — not necessary for a one-time purchase product.
- Advanced analytics or tracking features — these can be added in future versions but are not essential for V1.