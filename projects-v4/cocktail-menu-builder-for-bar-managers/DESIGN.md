## 1. Visual Direction
The overall look and feel of the Cocktail Menu Builder should be clean, professional, and approachable. This style is essential for building trust with bar managers who need a reliable tool for crafting cocktail menus. The clean design ensures that the interface is not cluttered, allowing users to focus on their tasks without distractions. A professional aesthetic resonates with the target audience, while an approachable tone encourages engagement and ease of use.

## 2. Color Palette
| Role          | Color       | Hex     | Usage                            |
|---------------|-------------|---------|----------------------------------|
| Primary       | Dark Teal  | #005F5F | Buttons, links, key actions      |
| Secondary     | Coral      | #FF6F61 | Secondary actions, accents       |
| Background     | Light Beige | #F9F3E3 | Page background                  |
| Surface       | White      | #FFFFFF | Cards, panels                    |
| Text Primary  | Dark Gray  | #333333 | Headings, body text              |
| Text Secondary | Medium Gray| #7D7D7D | Labels, captions                 |
| Success       | Green      | #28A745 | Positive states                  |
| Warning       | Orange     | #FFC107 | Caution states                   |
| Error         | Red        | #DC3545 | Error states                     |
| Border        | Light Gray | #E0E0E0 | Dividers, input borders          |

## 3. Typography
- **Heading font:** Montserrat - available on Google Fonts.
- **Body font:** Open Sans - available on Google Fonts.
- **Mono font:** Courier New - system font.
- Size scale: 
  - h1: 32px
  - h2: 24px
  - h3: 20px
  - body: 16px
  - small: 14px
  - caption: 12px
- Font weights used: regular (400), medium (500), semibold (600), bold (700).

## 4. Layout Pattern
The application will follow a multi-page structure with a top navigation bar and a sidebar for easy access to different sections. The max content width should be 1200px to maintain readability. The spacing system will use a base unit of 8px, with common gaps of 16px and 24px. The design will adopt a mobile-first approach with breakpoints at 768px for tablets and 1024px for desktops.

## 5. Component Library
- **Button**: Used for primary actions (e.g., "Create Menu"). Customize with primary color.
- **Card**: Used for displaying cocktail recipes and menu items. Customize with surface color and shadow.
- **Input Field**: Used for entering ingredient names and quantities. Customize with border color.
- **Dropdown**: Used for selecting cocktail categories. Customize with secondary color for active state.
- **Modal**: Used for confirming actions (e.g., deleting a menu item). Customize with surface color and shadow.

## 6. Key Screens
### Screen name and URL path: Dashboard - `/dashboard`
- **Layout description**: The top features the navigation bar with the app title and user profile. The sidebar includes links to "My Menus," "Recipe Suggestions," and "Settings." The main area displays a grid of cocktail menu cards, with a prominent "Create New Menu" button at the top right.
- **Key elements**: 
  - Navigation bar: Title on the left, profile icon on the right.
  - Sidebar: Vertical list of links.
  - Main area: Grid of cards with cocktail menu previews.
  - CTA: "Create New Menu" button in the top right corner.
- **Empty state**: A message stating "No menus created yet. Start by clicking 'Create New Menu'" with a visual illustration of a cocktail shaker.

### Screen name and URL path: Recipe Suggestions - `/recipe-suggestions`
- **Layout description**: The top features the same navigation bar. The sidebar remains consistent. The main area displays a list of suggested cocktails based on available ingredients, with filters at the top.
- **Key elements**: 
  - Filters: Dropdowns for ingredient selection.
  - List items: Each item shows cocktail name, image, and "Add to Menu" button.
  - CTA: "Save Selected Recipes" button at the bottom.
- **Empty state**: A message stating "No recipes found. Please add ingredients to see suggestions."

## 7. Reference Sites
- [Cocktail Builder](https://www.cocktailbuilder.com)
  - What to take from it: Clean layout and user-friendly navigation.
  
- [The Cocktail Project](https://www.thecocktailproject.com)
  - What to take from it: Color palette and typography that feels professional yet approachable.

- [Drizly](https://drizly.com)
  - What to take from it: Effective use of cards for product display and a clear call-to-action.

- [Punch Drink](https://punchdrink.com)
  - What to take from it: Minimalist design with a focus on content and readability.