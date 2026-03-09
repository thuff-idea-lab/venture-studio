## 1. Visual Direction
The overall look and feel of the Wix Product Customizer for Engraved Items should be clean, warm, and friendly, with a touch of professionalism. This style resonates with the target user, the owner of a boutique gift shop, who values a welcoming and approachable interface that reflects the personal touch of their business. The design should foster trust and confidence, ensuring users feel comfortable navigating complex customizations without feeling overwhelmed.

## 2. Color Palette
| Role          | Color      | Hex      | Usage                                 |
|---------------|------------|----------|---------------------------------------|
| Primary       | Teal       | #008080  | Buttons, links, key actions           |
| Secondary     | Coral      | #FF6F61  | Secondary actions, accents            |
| Background    | Light Gray | #F7F7F7  | Page background                       |
| Surface       | White      | #FFFFFF  | Cards, panels                         |
| Text Primary   | Dark Slate | #2E2E2E  | Headings, body text                   |
| Text Secondary | Gray       | #A9A9A9  | Labels, captions                      |
| Success       | Green      | #28A745  | Positive states                       |
| Warning       | Orange     | #FFC107  | Caution states                        |
| Error         | Red        | #DC3545  | Error states                          |
| Border        | Light Gray | #D3D3D3  | Dividers, input borders               |

## 3. Typography
- **Heading font:** Montserrat, available on Google Fonts
- **Body font:** Open Sans, available on Google Fonts
- **Mono font:** Courier New (system font)
- Size scale:
  - h1: 32px
  - h2: 24px
  - h3: 20px
  - body: 16px
  - small: 14px
  - caption: 12px
- Font weights used:
  - Regular: 400
  - Medium: 500
  - Semibold: 600
  - Bold: 700

## 4. Layout Pattern
The product will be structured as a single-page application with a clear, linear flow. The maximum content width should be 1200px to ensure readability. A spacing system based on a base unit of 8px will be used, with common gaps of 16px and 24px for larger separations. The design will adopt a mobile-first approach with breakpoints at 768px (tablet) and 1024px (desktop) to ensure a seamless experience across devices.

## 5. Component Library
- **Button**
  - Where it's used: Throughout the app for actions like "Add to Cart" and "Preview"
  - Customization notes: Primary buttons should use the primary color, secondary buttons the secondary color.

- **Input Field**
  - Where it's used: For customization inputs (text, material selection)
  - Customization notes: Rounded corners, consistent padding of 12px.

- **Card**
  - Where it's used: For displaying product options and previews
  - Customization notes: Subtle shadow for depth, padding of 16px.

- **Modal**
  - Where it's used: For confirmations and additional information
  - Customization notes: Centered on screen, with a semi-transparent background overlay.

## 6. Key Screens
### Screen name and URL path
- **Home Screen** - `/`

#### Layout description:
- **Top:** Logo and navigation bar with links to support and documentation.
- **Middle:** Main product customization area with a 3D preview on the left and customization options on the right.
- **Bottom:** Footer with contact information and social media links.

#### Key elements:
- **Logo:** Top left
- **Navigation Links:** Top right
- **3D Preview Area:** Left side, taking up 50% of the width
- **Customization Options:** Right side, includes input fields and buttons
- **CTA Button ("Preview Design"):** Prominently placed below customization options

#### Empty state:
Before any customization, the user sees a placeholder image in the 3D preview area with a message: "Start customizing your engraved item!" and a button to "Get Started".

### Screen name and URL path
- **Support Screen** - `/support`

#### Layout description:
- **Top:** Same navigation bar as the Home Screen.
- **Middle:** FAQ section with expandable questions and answers.
- **Bottom:** Footer as on the Home Screen.

#### Key elements:
- **FAQ Header:** "Frequently Asked Questions"
- **Expandable FAQ Items:** List of questions that expand to show answers when clicked
- **Contact Support Button:** At the bottom of the FAQ section

#### Empty state:
If no FAQs are available, display a message: "No FAQs available. Please contact support for assistance."

## 7. Reference Sites
- **Etsy** - [etsy.com](https://www.etsy.com)
  - What to take from it: Warm color palette and friendly typography that appeals to boutique shop owners.

- **Canva** - [canva.com](https://www.canva.com)
  - What to take from it: Clean layout and intuitive interface that simplifies complex tasks.

- **Shopify** - [shopify.com](https://www.shopify.com)
  - What to take from it: Professional design and trust-building elements that resonate with small business owners.

- **Zazzle** - [zazzle.com](https://www.zazzle.com)
  - What to take from it: Effective use of product customization tools and clear visual hierarchy.