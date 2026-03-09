## 1. Visual Direction
The overall look and feel of the Minimalist Task Management Dashboard is clean, minimal, and friendly. This style is essential for ADHD users, as it reduces cognitive overload and distractions, allowing them to focus on their tasks. The warm color palette and simple typography create a welcoming environment that fosters trust and encourages productivity. By avoiding clutter and maintaining a straightforward design, users can navigate the tool effortlessly, making their task management experience more enjoyable and effective.

## 2. Color Palette
| Role          | Color       | Hex      | Usage                                   |
|---------------|-------------|----------|-----------------------------------------|
| Primary       | Sky Blue    | #00A3E0  | Buttons, links, key actions             |
| Secondary     | Soft Coral  | #FF6F61  | Secondary actions, accents              |
| Background    | Light Gray  | #F7F7F7  | Page background                         |
| Surface       | White       | #FFFFFF  | Cards, panels                           |
| Text Primary   | Charcoal    | #333333  | Headings, body text                     |
| Text Secondary | Gray        | #888888  | Labels, captions                        |
| Success       | Green       | #4CAF50  | Positive states                         |
| Warning       | Orange      | #FF9800  | Caution states                          |
| Error         | Red         | #F44336  | Error states                            |
| Border        | Light Gray  | #E0E0E0  | Dividers, input borders                 |

## 3. Typography
- **Heading font:** Poppins (available on Google Fonts)
- **Body font:** Open Sans (available on Google Fonts)
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
The application will be a multi-page layout with a navigation bar at the top. The max content width will be 1200px to ensure readability and focus. The spacing system will use a base unit of 8px, with common gaps of 16px and 32px for larger sections. The responsive approach will be mobile-first, with breakpoints at 640px (small devices), 768px (tablets), and 1024px (desktops).

## 5. Component Library
- **Button**
  - Where it's used: Throughout the app for actions (e.g., adding tasks, saving changes)
  - Customization notes: Rounded corners, primary color for main actions, secondary color for less critical actions.
  
- **Input Field**
  - Where it's used: Task entry, search bar
  - Customization notes: Clear, spacious design with subtle borders.

- **Card**
  - Where it's used: Task display, information panels
  - Customization notes: Shadow effect for depth, consistent padding.

- **Modal**
  - Where it's used: Confirmations, task details
  - Customization notes: Centered, with a semi-transparent background overlay.

## 6. Key Screens
### 1. Dashboard Screen
- **URL path:** /dashboard
- **Layout description:** The top features a fixed navigation bar with the app title and a user profile icon. The middle section displays a grid of task cards, and the bottom has a footer with links to help and settings.
- **Key elements:** 
  - Navigation bar (top): App title, profile icon, settings link
  - Task cards (middle): Each card displays task title, due date, and status
  - Footer (bottom): Help link, contact info
- **Empty state:** A message prompts users to add their first task, with a button to create a new task.

### 2. Task Detail Screen
- **URL path:** /task/:id
- **Layout description:** The top has a back button and the task title. The middle contains task details (description, due date, priority), and the bottom has action buttons for saving or deleting the task.
- **Key elements:** 
  - Back button (top left)
  - Task title (top center)
  - Task details (middle): Description field, date picker, priority dropdown
  - Action buttons (bottom): Save, Delete
- **Empty state:** A prompt to create a new task appears if no task is selected.

## 7. Reference Sites
- **Todoist**: [todoist.com](https://todoist.com)
  - What to take from it: Clean layout and minimalistic design that emphasizes task management without distractions.
  
- **Trello**: [trello.com](https://trello.com)
  - What to take from it: Card-based organization that is visually appealing and easy to navigate.

- **Notion**: [notion.so](https://www.notion.so)
  - What to take from it: Flexible layout options that allow for a personalized task management experience.

- **Google Keep**: [keep.google.com](https://keep.google.com)
  - What to take from it: Simple and friendly interface that prioritizes ease of use and accessibility.