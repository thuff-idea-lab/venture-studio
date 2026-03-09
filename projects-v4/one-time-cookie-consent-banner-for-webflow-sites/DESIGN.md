## 1. Visual Direction
The overall look and feel of the cookie consent banner should be clean, professional, and minimal. This style builds trust with Webflow users, who are often freelancers or small business owners looking for straightforward solutions. A professional aesthetic conveys reliability, while minimalism ensures that the banner does not distract from the main content of their websites. The design should feel friendly and approachable, making it easy for users to understand their cookie consent options without overwhelming them with information.

## 2. Color Palette
| Role          | Color       | Hex      | Usage                                |
|---------------|-------------|----------|--------------------------------------|
| Primary       | Blue        | #007BFF  | Buttons, links, key actions          |
| Secondary     | Light Gray  | #F8F9FA  | Secondary actions, accents           |
| Background    | White       | #FFFFFF  | Page background                      |
| Surface       | Light Blue  | #E7F1FF  | Cards, panels                        |
| Text Primary   | Dark Gray   | #343A40  | Headings, body text                  |
| Text Secondary | Gray        | #6C757D  | Labels, captions                     |
| Success       | Green       | #28A745  | Positive states                      |
| Warning       | Orange      | #FFC107  | Caution states                       |
| Error         | Red         | #DC3545  | Error states                         |
| Border        | Light Gray  | #CED4DA  | Dividers, input borders              |

## 3. Typography
- **Heading font:** Poppins - [Google Fonts](https://fonts.google.com/specimen/Poppins)
- **Body font:** Roboto - [Google Fonts](https://fonts.google.com/specimen/Roboto)
- **Mono font:** Courier New
- **Size scale:**
  - h1: 32px
  - h2: 24px
  - h3: 18px
  - body: 16px
  - small: 14px
  - caption: 12px
- **Font weights used:**
  - Regular: 400
  - Medium: 500
  - Semibold: 600
  - Bold: 700

## 4. Layout Pattern
The product will be a single-page app with a simple layout that features the cookie consent banner prominently. The max content width should be 1200px, ensuring readability across devices. The spacing system will use a base unit of 8px, with common gaps of 16px and 24px for larger elements. The design will follow a mobile-first approach, with breakpoints at 640px (small devices), 768px (tablets), and 1024px (desktops).

## 5. Component Library
- **Button**
  - Where it's used: Primary actions on the cookie consent banner.
  - Customization notes: Rounded corners with a shadow effect for a modern look.
  
- **Alert Banner**
  - Where it's used: Displaying cookie consent information.
  - Customization notes: Use the primary color for background and white text.

- **Input Field**
  - Where it's used: For user customization options (e.g., text input for cookie policy link).
  - Customization notes: Include a subtle border with rounded corners.

## 6. Key Screens
### Screen name and URL path
- **Cookie Consent Banner** - `/cookie-consent`

### Layout description
- **Top:** The banner will be fixed at the bottom of the viewport.
- **Middle:** The main content area will contain the cookie consent message and options.
- **Bottom:** The banner will have a prominent "Accept" button and a "Learn More" link.

### Key elements
- **Banner Background:** Light Blue (#E7F1FF)
- **Text:** "We use cookies to enhance your experience. By continuing to visit this site, you agree to our use of cookies." (Text Primary color)
- **Accept Button:** Blue (#007BFF) with white text.
- **Learn More Link:** Dark Gray (#343A40) with an underline.
- **Close Button (X):** Positioned in the top right corner.

### Empty state
Before any action, the user will see the banner with the default message and options to accept or learn more.

## 7. Reference Sites
- **Website:** [CookieYes](https://www.cookieyes.com/)
  - **What to take from it:** Clean layout and professional color palette.

- **Website:** [Iubenda](https://www.iubenda.com/)
  - **What to take from it:** Minimalist design and clear typography.

- **Website:** [Cookiebot](https://www.cookiebot.com/)
  - **What to take from it:** Effective use of space and friendly tone in messaging. 

- **Website:** [Osano](https://www.osano.com/)
  - **What to take from it:** Professional look with a focus on user trust and transparency.