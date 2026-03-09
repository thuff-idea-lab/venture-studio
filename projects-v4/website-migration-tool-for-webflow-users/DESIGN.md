## 1. Visual Direction
The overall look and feel of the Website Migration Tool is clean, professional, and technical, with a touch of friendliness to make it approachable for freelancers. The design emphasizes clarity and usability, ensuring that users can easily navigate the tool without feeling overwhelmed. This style fits the target user—freelance web developers—who appreciate straightforward, efficient tools that help them save time and enhance their workflow.

## 2. Color Palette
| Role          | Color      | Hex     | Usage                                     |
|---------------|------------|---------|-------------------------------------------|
| Primary       | Blue       | #007BFF | Buttons, links, key actions               |
| Secondary     | Gray       | #6C757D | Secondary actions, accents                |
| Background    | White      | #FFFFFF | Page background                           |
| Surface       | Light Gray | #F8F9FA | Cards, panels                             |
| Text Primary   | Dark Gray  | #343A40 | Headings, body text                       |
| Text Secondary | Medium Gray| #868E96 | Labels, captions                          |
| Success       | Green      | #28A745 | Positive states                           |
| Warning       | Orange     | #FFC107 | Caution states                            |
| Error         | Red        | #DC3545 | Error states                              |
| Border        | Light Gray | #CED4DA | Dividers, input borders                   |

## 3. Typography
- **Heading font:** Inter - available on [Google Fonts](https://fonts.google.com/specimen/Inter)
- **Body font:** Roboto - available on [Google Fonts](https://fonts.google.com/specimen/Roboto)
- **Mono font:** Fira Code - available on [Google Fonts](https://fonts.google.com/specimen/Fira+Code)
- Size scale:
  - h1: 32px / 2rem
  - h2: 24px / 1.5rem
  - h3: 20px / 1.25rem
  - body: 16px / 1rem
  - small: 14px / 0.875rem
  - caption: 12px / 0.75rem
- Font weights used: regular (400), medium (500), semibold (600), bold (700)

## 4. Layout Pattern
The Website Migration Tool is a multi-page application with a top navigation bar and a dashboard layout. The maximum content width is 1200px, ensuring readability and a clean layout. The spacing system uses a base unit of 8px, with common gaps of 16px and 24px for larger elements. The design follows a mobile-first approach, with breakpoints at 768px (tablet) and 1024px (desktop) to ensure responsiveness.

## 5. Component Library
- **Button**
  - Where it's used: Throughout the app for actions like "Upload" or "Start Migration."
  - Customization notes: Use primary color for main actions, secondary color for less important actions.
  
- **Input Field**
  - Where it's used: For user inputs like URLs or file uploads.
  - Customization notes: Rounded corners, consistent padding, and border colors.

- **Card**
  - Where it's used: To display migration project summaries.
  - Customization notes: Shadow effects for depth, consistent margins.

- **Alert**
  - Where it's used: For success, warning, and error messages.
  - Customization notes: Color-coded backgrounds based on the alert type.

## 6. Key Screens
### Screen name and URL path: Dashboard - `/dashboard`
- **Layout description:** The top features a navigation bar with the logo and links to "Projects" and "Settings." The middle section displays a summary of ongoing projects in card format. The bottom contains a footer with contact information and links to support.
- **Key elements:** 
  - Navigation bar (top): Logo on the left, links on the right.
  - Project cards (middle): Each card contains project name, status, and action buttons.
  - Footer (bottom): Contact info and support links.
- **Empty state:** A message prompting the user to start a new migration project, with a button to "Create Project."

### Screen name and URL path: Project Details - `/project/:id`
- **Layout description:** The top features the project title and a "Back" button. The middle section contains detailed information about the migration, including a progress bar and action buttons. The bottom has a summary of errors or warnings.
- **Key elements:** 
  - Project title (top): Large heading.
  - Progress bar (middle): Indicates migration status.
  - Action buttons (middle): "Retry" and "Download Output."
  - Summary section (bottom): List of errors or warnings.
- **Empty state:** A message indicating no data has been processed yet, with a button to "Start Migration."

## 7. Reference Sites
- **URL:** [Airtable](https://airtable.com)
  - **What to take from it:** Clean layout, professional color palette, and intuitive navigation.
  
- **URL:** [Notion](https://www.notion.so)
  - **What to take from it:** Minimalistic design, effective use of whitespace, and friendly typography.

- **URL:** [Trello](https://trello.com)
  - **What to take from it:** Clear card layouts, color-coded elements, and straightforward user interactions.

- **URL:** [Asana](https://asana.com)
  - **What to take from it:** Professional look, effective use of icons, and clean typography.