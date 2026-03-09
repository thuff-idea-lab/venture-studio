## 1. Product Overview
This Chrome extension enhances screen recordings by automatically applying natural zooms and smooth cursor animations, specifically designed for product managers creating demo videos. It addresses the frustration and inefficiency of spending hours on post-editing by streamlining the recording process, allowing users to focus on content creation rather than editing.

## 2. Tech Stack
- **Framework:** Plain HTML/CSS/JavaScript - A lightweight approach is suitable for a Chrome extension, minimizing overhead and complexity.
- **Styling:** CSS Modules - Provides scoped styles to avoid conflicts and maintain a clean structure for the extension's UI.
- **Database:** None - The extension will not require persistent data storage; recordings will be handled locally.
- **Hosting:** N/A - Chrome extensions are distributed through the Chrome Web Store, eliminating the need for traditional hosting.
- **Payment processor:** Gumroad - Simple integration for one-time purchases, suitable for selling digital products like extensions.
- **Any external APIs or data sources:** No external API integrations required for V1.

## 3. Data Model
```typescript
interface Recording {
  id: string;
  title: string;
  createdAt: Date;
  duration: number; // in seconds
  zoomLevel: number; // percentage
  cursorSmoothness: number; // scale from 1 to 10
}
```

## 4. Page/Route Map
- **Path:** `/`
  - **Purpose:** Main interface for starting a screen recording.
  - **Key components on the page:** Start Recording button, Settings panel, Help section.

- **Path:** `/settings`
  - **Purpose:** Configuration options for zoom level and cursor smoothness.
  - **Key components on the page:** Zoom slider, Cursor smoothness slider, Save Settings button.

- **Path:** `/help`
  - **Purpose:** Provide users with guidance on using the extension.
  - **Key components on the page:** FAQ section, Contact support link.

## 5. Core User Flows
1. **Start Recording**
   - User action: Clicks "Start Recording" button.
   - System response: Initiates screen recording with selected settings.
   - What the user sees: Recording interface with a timer and stop button.

2. **Adjust Settings**
   - User action: Navigates to `/settings` and adjusts sliders.
   - System response: Saves settings locally.
   - What the user sees: Confirmation message indicating settings have been saved.

3. **Access Help**
   - User action: Clicks "Help" from the main interface.
   - System response: Redirects to the `/help` page.
   - What the user sees: Help documentation and support contact information.

4. **Error State: Recording Failure**
   - User action: Clicks "Start Recording" but the system fails to access screen.
   - System response: Displays an error message.
   - What the user sees: "Unable to start recording. Please check permissions."

## 6. API/Integration Contracts
No external API integrations required for V1.

## 7. Monetization Integration
- **What is free vs. paid?** The core recording features are free; advanced features (cloud storage and editing tools) will be paid.
- **Where does the paywall/checkout appear in the user flow?** The paywall will appear in the settings page when users attempt to access advanced features.
- **What payment provider and integration approach?** Gumroad will be used for one-time purchases; integration will be via a simple redirect to the Gumroad checkout page.
- **What happens after payment?** Users will receive a confirmation email with a download link for the advanced features.

## 8. Data Seeding
No seeding needed; users will bring their own data (screen recordings).

## 9. File Structure
```
project-root/
  src/
    app/         — main interface and routes
    components/  — reusable UI components
    lib/         — utilities and helpers
    styles/      — CSS Modules for styling
    assets/      — icons and images
```

## 10. V1 Scope Boundary
**BUILD (must have for V1):**
- Screen recording functionality with basic zoom and cursor smoothing.
- Settings page for adjusting zoom and cursor smoothness.
- Help section with basic usage instructions.

**DO NOT BUILD (explicitly out of scope):**
- Cloud storage for recordings — requires additional infrastructure and complexity.
- Advanced editing tools — would extend the scope significantly beyond the MVP.