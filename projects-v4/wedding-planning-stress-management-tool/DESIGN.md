## 1. Visual Direction
The overall look and feel of the Wedding Planning Stress Management Tool should be clean, warm, and friendly, with a professional touch. This style fits the target user—stressed wedding planners—by creating a sense of calm and trust. The warmth of the design will help alleviate anxiety, while the clean layout ensures that users can easily navigate through complex information without feeling overwhelmed. The friendly aesthetic invites users to engage with the tool, making the planning process feel more manageable and less daunting.

## 2. Color Palette
| Role          | Color        | Hex     | Usage                                      |
|---------------|--------------|---------|--------------------------------------------|
| Primary       | Soft Coral   | #FF6F61 | Buttons, links, key actions                |
| Secondary     | Light Sage   | #B2D8C8 | Secondary actions, accents                  |
| Background    | Off-White    | #F9F9F9 | Page background                            |
| Surface       | White        | #FFFFFF | Cards, panels                              |
| Text Primary   | Dark Slate   | #333333 | Headings, body text                        |
| Text Secondary | Gray         | #757575 | Labels, captions                           |
| Success       | Soft Green   | #A8E6CE | Positive states                            |
| Warning       | Amber        | #FFB74D | Caution states                             |
| Error         | Soft Red     | #FF8A80 | Error states                               |
| Border        | Light Gray   | #E0E0E0 | Dividers, input borders                    |

## 3. Typography
- **Heading font:** Poppins (Google Fonts)
- **Body font:** Roboto (Google Fonts)
- **Mono font (if needed):** Courier New (system)
- Size scale:
  - h1: 32px / 2rem
  - h2: 28px / 1.75rem
  - h3: 24px / 1.5rem
  - body: 16px / 1rem
  - small: 14px / 0.875rem
  - caption: 12px / 0.75rem
- Font weights used: 
  - Regular: 400
  - Medium: 500
  - Semibold: 600
  - Bold: 700

## 4. Layout Pattern
The application will be a multi-page web app with a navigation bar at the top. The max content width will be 1200px, ensuring a clean and spacious layout. The spacing system will use a base unit of 8px, with common gaps of 16px and 32px. The design will follow a mobile-first approach, with breakpoints at 768px for tablets and 1024px for desktops.

## 5. Component Library
- **Button:** Used for primary actions (e.g., "Add Task"). Customize with primary color and rounded corners.
- **Input Field:** Used for form entries (e.g., task name, budget). Customize with light border and padding.
- **Card:** Used for displaying tasks and budgets. Customize with shadow and rounded edges.
- **Modal:** Used for confirmations and additional information. Customize with a semi-transparent background.
- **Checkbox:** Used for task completion. Customize with primary color for checked state.

## 6. Key Screens
- **Screen name and URL path:** Home Screen - `/`
  - **Layout description:** The top features a navigation bar with the app title and links to sections (Checklist, Timeline, Budget). The middle displays a summary of tasks with a progress bar. The bottom includes a footer with contact info and links to support.
  - **Key elements:** 
    - Navigation bar (top): Logo, links
    - Progress bar (middle): Visual representation of completed tasks
    - Task list (middle): Cards for each task with checkboxes
    - Footer (bottom): Contact info, support links
  - **Empty state:** A friendly message encouraging users to start adding tasks with a button to "Create Your First Task."

- **Screen name and URL path:** Budget Screen - `/budget`
  - **Layout description:** The top has the navigation bar. The middle shows a budget overview with charts. The bottom has a list of expenses.
  - **Key elements:** 
    - Navigation bar (top): Same as Home
    - Budget overview (middle): Pie chart, total budget displayed prominently
    - Expense list (middle): Cards for each expense with edit/delete options
    - Footer (bottom): Same as Home
  - **Empty state:** A prompt to add the first expense with a button labeled "Add Expense."

## 7. Reference Sites
- **URL:** [The Knot](https://www.theknot.com)
  - **What to take from it:** Clean layout, warm color palette, and user-friendly navigation.
  
- **URL:** [WeddingWire](https://www.weddingwire.com)
  - **What to take from it:** Professional typography and organization of information, especially in budget sections.
  
- **URL:** [Zola](https://www.zola.com)
  - **What to take from it:** Friendly and inviting design, effective use of space, and engaging visual elements.
  
- **URL:** [Mint](https://www.mint.com)
  - **What to take from it:** Clear data visualization techniques and a calm color scheme that promotes trust.