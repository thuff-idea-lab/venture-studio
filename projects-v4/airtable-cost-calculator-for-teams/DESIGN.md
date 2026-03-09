## 1. Visual Direction
The overall look and feel of the Airtable Cost Calculator for Teams is clean, professional, and user-friendly. The design emphasizes clarity and functionality, ensuring that project managers and team leads can easily navigate and understand the tool. This style builds trust with the target user by presenting a straightforward interface that minimizes distractions and focuses on the essential task of cost estimation. The use of soft, muted colors and clear typography enhances readability and reduces cognitive load, making the tool approachable for users who may not be tech-savvy.

## 2. Color Palette
| Role          | Color        | Hex      | Usage                                   |
|---------------|--------------|----------|-----------------------------------------|
| Primary       | Blue         | #007BFF  | Buttons, links, key actions             |
| Secondary     | Light Gray   | #F8F9FA  | Secondary actions, accents               |
| Background    | White        | #FFFFFF  | Page background                         |
| Surface       | Light Blue   | #E9F5FF  | Cards, panels                           |
| Text Primary   | Dark Gray    | #343A40  | Headings, body text                     |
| Text Secondary | Gray         | #6C757D  | Labels, captions                        |
| Success       | Green        | #28A745  | Positive states                         |
| Warning       | Orange       | #FFC107  | Caution states                          |
| Error         | Red          | #DC3545  | Error states                            |
| Border        | Light Gray   | #CED4DA  | Dividers, input borders                 |

## 3. Typography
- **Heading font:** Poppins - available on [Google Fonts](https://fonts.google.com/specimen/Poppins)
- **Body font:** Roboto - available on [Google Fonts](https://fonts.google.com/specimen/Roboto)
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
The application is designed as a single-page app, focusing on a streamlined user experience. The max content width is 1200px, ensuring readability across devices. A spacing system based on a base unit of 8px is used, with common gaps of 16px between elements. The design follows a mobile-first approach, with breakpoints at 768px (tablet) and 1024px (desktop) to adapt the layout accordingly.

## 5. Component Library
- **Button**
  - Where it's used: Call-to-action for submitting data and generating cost estimates.
  - Customization notes: Primary button in blue (#007BFF), secondary button in light gray (#F8F9FA).
  
- **Input Field**
  - Where it's used: For entering team size and data usage.
  - Customization notes: Rounded corners, with a border color of light gray (#CED4DA).

- **Card**
  - Where it's used: To display the cost estimate results.
  - Customization notes: Light blue background (#E9F5FF) with shadow for depth.

- **Alert**
  - Where it's used: To show success, warning, or error messages.
  - Customization notes: Use color coding for different states (green for success, orange for warning, red for error).

## 6. Key Screens
### Screen name and URL path
**Home Screen** - `/`

**Layout description:** 
- **Top:** Header with the product title and a brief tagline.
- **Middle:** Main area with input fields for team size and data usage, followed by a "Calculate" button.
- **Bottom:** A results section that displays the cost estimate and a "Download Report" button.

**Key elements:**
- Header: Product title (h1) centered at the top.
- Input Fields: Two input fields (team size and data usage) stacked vertically, with labels above each.
- CTA Button: "Calculate" button directly below the input fields.
- Results Section: A card displaying the estimated cost, with a "Download Report" button below.

**Empty state:** Before any data is entered, the input fields will display placeholder text ("Enter team size", "Enter data usage"). The results section will be hidden until the calculation is performed.

## 7. Reference Sites
- **Airtable** - [https://airtable.com](https://airtable.com)
  - What to take from it: Clean layout and professional color palette that builds trust.

- **Google Sheets** - [https://sheets.google.com](https://sheets.google.com)
  - What to take from it: User-friendly interface and clear typography that enhances usability.

- **Typeform** - [https://www.typeform.com](https://www.typeform.com)
  - What to take from it: Minimalistic design approach that focuses on user engagement and simplicity.

- **Notion** - [https://www.notion.so](https://www.notion.so)
  - What to take from it: Effective use of space and modern aesthetics that appeal to professionals.