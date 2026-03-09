## 1. Visual Direction
The overall look and feel of the Unified Email Management Tool is clean, professional, and user-friendly. This style is characterized by a minimal aesthetic that emphasizes functionality and clarity, which is essential for freelancers and small business owners who need to manage multiple email accounts efficiently. A warm color palette and friendly typography will create a sense of trust and approachability, making users feel comfortable while navigating their email tasks.

## 2. Color Palette
| Role          | Color      | Hex      | Usage                                  |
|---------------|------------|----------|----------------------------------------|
| Primary       | Blue       | #007BFF  | Buttons, links, key actions            |
| Secondary     | Gray       | #6C757D  | Secondary actions, accents             |
| Background    | White      | #FFFFFF  | Page background                        |
| Surface       | Light Gray | #F8F9FA  | Cards, panels                          |
| Text Primary   | Black      | #212529  | Headings, body text                   |
| Text Secondary | Dark Gray  | #495057  | Labels, captions                       |
| Success       | Green      | #28A745  | Positive states                        |
| Warning       | Orange     | #FFC107  | Caution states                        |
| Error         | Red        | #DC3545  | Error states                           |
| Border        | Light Gray | #CED4DA  | Dividers, input borders                |

## 3. Typography
- **Heading font:** Poppins - [Google Fonts](https://fonts.google.com/specimen/Poppins)
- **Body font:** Roboto - [Google Fonts](https://fonts.google.com/specimen/Roboto)
- **Mono font:** Courier New (system)
- Size scale:
  - h1: 2.5rem (40px)
  - h2: 2rem (32px)
  - h3: 1.5rem (24px)
  - body: 1rem (16px)
  - small: 0.875rem (14px)
  - caption: 0.75rem (12px)
- Font weights used: Regular (400), Medium (500), Semibold (600), Bold (700)

## 4. Layout Pattern
The application will be a multi-page app with a navigation bar at the top. The maximum content width will be 1200px, ensuring a spacious layout that is easy to read. The spacing system will use a base unit of 8px, with common gaps of 16px, 24px, and 32px. The design will follow a mobile-first approach with breakpoints at 768px for tablet and 1024px for desktop.

## 5. Component Library
- **Button**: Used for primary actions (e.g., "Connect Account"). Customize with primary color.
- **Input Field**: Used for email input, tag input. Customize with border color.
- **Card**: Used for displaying email threads. Customize with surface color.
- **Modal**: Used for settings and custom signatures. Customize with background and border colors.
- **Dropdown**: Used for tagging and selecting email accounts. Customize with secondary color.

## 6. Key Screens
- **Screen name and URL path**: Dashboard - `/dashboard`
  - **Layout description**: The top features a navigation bar with the app logo and links to settings. The middle displays a list of emails with tags and action buttons. The bottom has a footer with copyright information. No sidebar.
  - **Key elements**: 
    - Navigation Bar (top)
    - Email List (middle)
    - Action Buttons (middle)
    - Footer (bottom)
  - **Empty state**: A message saying "No emails found. Connect your accounts to get started!" with a button to connect accounts.

- **Screen name and URL path**: Settings - `/settings`
  - **Layout description**: The top features a navigation bar. The middle contains form fields for custom signatures and tags. No sidebar.
  - **Key elements**: 
    - Navigation Bar (top)
    - Form Fields (middle)
    - Save Changes Button (middle)
  - **Empty state**: A message saying "No signatures created yet. Add your custom signature below."

## 7. Reference Sites
- [Mailchimp](https://mailchimp.com)
  - What to take from it: Clean layout and professional color palette.
  
- [Trello](https://trello.com)
  - What to take from it: User-friendly interface and card-based organization.

- [Asana](https://asana.com)
  - What to take from it: Minimalist design with clear typography and spacing.

- [Slack](https://slack.com)
  - What to take from it: Friendly and approachable design that builds trust.