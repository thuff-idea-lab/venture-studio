## 1. Visual Direction
The overall look and feel of the Chrome extension should be clean, professional, and minimal, creating an intuitive user experience that resonates with product managers. This style builds trust and confidence, essential for users who rely on the tool for creating polished demo videos. The design should emphasize clarity and efficiency, allowing users to focus on their recordings without unnecessary distractions.

## 2. Color Palette
| Role           | Color       | Hex     | Usage                           |
|----------------|-------------|---------|---------------------------------|
| Primary        | Blue        | #007BFF | Buttons, links, key actions     |
| Secondary      | Gray        | #6C757D | Secondary actions, accents      |
| Background     | White       | #FFFFFF | Page background                 |
| Surface        | Light Gray  | #F8F9FA | Cards, panels                   |
| Text Primary   | Dark Gray   | #343A40 | Headings, body text             |
| Text Secondary  | Gray        | #868E96 | Labels, captions                 |
| Success        | Green       | #28A745 | Positive states                 |
| Warning        | Orange      | #FFC107 | Caution states                  |
| Error          | Red         | #DC3545 | Error states                    |
| Border         | Light Gray  | #CED4DA | Dividers, input borders         |

## 3. Typography
- **Heading font:** Poppins (Google Fonts)
- **Body font:** Open Sans (Google Fonts)
- **Mono font:** Fira Code (Google Fonts)
- Size scale:
  - h1: 32px
  - h2: 24px
  - h3: 20px
  - body: 16px
  - small: 14px
  - caption: 12px
- Font weights used: regular (400), medium (500), semibold (600), bold (700)

## 4. Layout Pattern
The extension will function as a single-page app with a clean, streamlined interface. The max content width should be 1200px to ensure readability and focus. The spacing system will use a base unit of 8px, with common gaps of 16px and 24px. The design will adopt a mobile-first approach, with breakpoints at 768px (tablet) and 1024px (desktop) to ensure optimal usability across devices.

## 5. Component Library
- **Button**
  - Where it's used: Primary actions (e.g., "Start Recording")
  - Customization notes: Use primary color for main actions, secondary color for less important actions.
  
- **Input Field**
  - Where it's used: Form inputs for settings
  - Customization notes: Rounded corners, light border color.
  
- **Card**
  - Where it's used: Displaying recording previews
  - Customization notes: Shadow effect for depth, consistent padding.

- **Modal**
  - Where it's used: Confirmation dialogs for actions (e.g., "Are you sure you want to delete this recording?")
  - Customization notes: Centered with a semi-transparent background.

## 6. Key Screens
### Screen name and URL path: Dashboard - `/dashboard`
- **Layout description:** 
  - Top: Header with the title "Smooth Screen Recordings" and a user profile icon.
  - Middle: Main content area displaying recording previews in cards.
  - Bottom: Footer with copyright information and links to support.
- **Key elements:** 
  - Header: Title (left), Profile icon (right).
  - Main area: Grid of cards (3 columns) showing recordings.
  - Footer: Text links.
- **Empty state:** A message saying "No recordings yet. Start your first recording!" with a prominent "Start Recording" button.

### Screen name and URL path: Settings - `/settings`
- **Layout description:** 
  - Top: Header with "Settings" title.
  - Middle: Form with input fields for configuration options (e.g., resolution, cursor effects).
  - Bottom: Save and Cancel buttons.
- **Key elements:** 
  - Header: Title.
  - Form: Input fields for settings.
  - Buttons: "Save" (primary) and "Cancel" (secondary).
- **Empty state:** N/A, as this screen will always display settings options.

## 7. Reference Sites
- **URL:** [Loom](https://www.loom.com)
  - **What to take from it:** Clean layout, professional color palette, and intuitive navigation.
  
- **URL:** [Snagit](https://www.techsmith.com/screen-capture.html)
  - **What to take from it:** Effective use of cards for displaying features, clear typography, and minimalistic design.
  
- **URL:** [Camtasia](https://www.techsmith.com/video-editor.html)
  - **What to take from it:** Professional feel, clear calls to action, and effective use of whitespace.
  
- **URL:** [Notion](https://www.notion.so)
  - **What to take from it:** Clean design, effective use of typography, and a focus on user-friendly interactions.