## 1. Visual Direction
The overall look and feel of the Expense Tracker for Notion Consultants is clean, professional, and minimal. This style is chosen to instill trust and clarity, which is essential for consultants managing their finances. A straightforward interface reduces cognitive load, allowing users to focus on inputting and analyzing their expenses without distractions. The professional aesthetic aligns with the target audience's need for reliability and efficiency in a financial tool.

## 2. Color Palette
| Role          | Color      | Hex      | Usage                             |
|---------------|------------|----------|-----------------------------------|
| Primary       | Blue       | #007BFF  | Buttons, links, key actions       |
| Secondary     | Gray       | #6C757D  | Secondary actions, accents        |
| Background    | White      | #FFFFFF  | Page background                   |
| Surface       | Light Gray | #F8F9FA  | Cards, panels                     |
| Text Primary   | Black      | #212529  | Headings, body text               |
| Text Secondary | Dark Gray  | #495057  | Labels, captions                  |
| Success       | Green      | #28A745  | Positive states                   |
| Warning       | Orange     | #FFC107  | Caution states                    |
| Error         | Red        | #DC3545  | Error states                      |
| Border        | Light Gray | #CED4DA  | Dividers, input borders           |

## 3. Typography
- **Heading font:** Poppins (available on Google Fonts)
- **Body font:** Roboto (available on Google Fonts)
- **Mono font:** Courier New (system font)
- Size scale:
  - h1: 32px
  - h2: 24px
  - h3: 18px
  - body: 16px
  - small: 14px
  - caption: 12px
- Font weights used: regular (400), medium (500), semibold (600), bold (700)

## 4. Layout Pattern
The Expense Tracker will be a multi-page application with a navigation bar at the top. The maximum content width will be 1200px to ensure readability. The spacing system will use a base unit of 8px, with common gaps being multiples of this unit (e.g., 8px, 16px, 24px). The responsive approach will be mobile-first, with breakpoints at 768px (tablet) and 1024px (desktop).

## 5. Component Library
- **Button**
  - Where it's used: Throughout the application for actions like "Add Expense," "Generate Report."
  - Customization notes: Primary buttons should use the Primary color, secondary buttons should use the Secondary color.

- **Input Field**
  - Where it's used: For entering expense details, category, amount, etc.
  - Customization notes: Use rounded corners and a light border color.

- **Card**
  - Where it's used: For displaying individual expense entries and summary panels.
  - Customization notes: Use Surface color with a subtle shadow for depth.

- **Table**
  - Where it's used: For listing expenses and generating reports.
  - Customization notes: Use alternating row colors for better readability.

## 6. Key Screens
### Screen name and URL path: Dashboard - `/dashboard`
- **Layout description:** The top features a navigation bar with the title "Expense Tracker" and links to "Dashboard," "Reports," and "Settings." The middle displays a summary of expenses with cards for "Total Expenses," "Monthly Breakdown," and "Recent Entries." The bottom includes a footer with copyright information.
- **Key elements:**
  - Navigation bar (top)
  - Summary cards (middle)
  - Recent entries table (middle)
  - Footer (bottom)
- **Empty state:** Before any data is added, show a message "No expenses recorded yet. Start adding your expenses!"

### Screen name and URL path: Add Expense - `/add-expense`
- **Layout description:** The top has the navigation bar. The middle contains a form with input fields for "Expense Name," "Amount," "Category," and a "Submit" button. The bottom has a footer.
- **Key elements:**
  - Navigation bar (top)
  - Form fields (middle)
  - Submit button (middle)
  - Footer (bottom)
- **Empty state:** N/A, as this screen will always have input fields.

### Screen name and URL path: Reports - `/reports`
- **Layout description:** The top features the navigation bar. The middle displays visualizations (charts) of expenses by category and month. The bottom includes a footer.
- **Key elements:**
  - Navigation bar (top)
  - Charts (middle)
  - Footer (bottom)
- **Empty state:** "No data available for reports. Please add expenses to generate reports."

## 7. Reference Sites
- **URL:** [Expensify](https://www.expensify.com)
  - What to take from it: Clean layout and professional color palette that builds trust.

- **URL:** [Mint](https://www.mint.com)
  - What to take from it: Effective use of visualizations for financial data and a friendly interface.

- **URL:** [Wave](https://www.waveapps.com)
  - What to take from it: Minimalist design and clear typography that enhances usability for freelancers.

- **URL:** [YNAB](https://www.youneedabudget.com)
  - What to take from it: Strong focus on user experience and clarity in expense tracking.