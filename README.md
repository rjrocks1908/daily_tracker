# Daily Tracker

A modern web application for tracking daily habits and maintaining a personal diary. Built with React, TypeScript, Vite, and Firebase.

## Features

### 📋 Task Tracking

- Create and manage daily tasks/habits
- Weekly calendar view with task completion tracking
- Visual progress indicator
- Navigate between weeks to view historical data
- Click on task names to view detailed calendar for individual tasks

### 📖 Diary

- Personal diary with monthly calendar view
- Create, edit, and delete diary entries
- Date highlighting for entries
- Prevents future date entries
- Optimized data fetching with caching
- Rich text area for writing thoughts

### 💸 Daily Expenses

- Add, edit, and delete daily expenses
- Create, edit, and delete reusable expense tags from a dedicated Tags page
- Filter this month's expenses by one or more tags
- View a dedicated monthly expense calendar with month navigation and monthly totals

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Authentication + Firestore)
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd daily_tracker
```

2. Install dependencies:

```bash
npm install
```

3. Configure Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Copy your Firebase config and update `src/firebase/config.ts`

4. Set up Firestore indexes:
   - The app will prompt you to create required indexes on first use
   - Or manually create composite indexes:
     - Collection: `diary_placeholders` - Fields: `userId` (Ascending), `date` (Ascending)
     - Collection: `diary_entries` - Fields: `userId` (Ascending), `date` (Ascending)

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage

### Task Tracking

1. **Create a Task**: Click "+ Add New Task" on the home page
2. **Mark Completion**: Click on date cells in the task grid to toggle completion
3. **View Details**: Click on a task name to see its full calendar view
4. **Navigate Weeks**: Use Previous/Next Week buttons to view different time periods

### Diary

1. **Access Diary**: Click the "Diary" button in the header
2. **Create Entry**: Click on any past or current date in the calendar
3. **Write**: Type your thoughts in the text area
4. **Save**: Click "Save Entry" to store your entry
5. **Edit**: Click on a highlighted date to edit existing entries
6. **Delete**: Use the "Delete Entry" button to remove entries
7. **Refresh**: Click the refresh button to update highlighted dates

### Daily Expenses

1. **Open Expenses**: Click the "Expenses" tab from the home header
2. **Add Expense**: Enter amount, date, optional note, and tags
3. **Filter**: Select one or more tags in the filter section (this month view)
4. **Manage Tags**: Open "Manage Tags" to create, edit, and delete tags
5. **Monthly Calendar**: Open "View Monthly Calendar" to see date-wise spends and month total
6. **Edit/Delete**: Manage expenses from the main expenses page

## Project Structure

```
daily_tracker/
├── src/
│   ├── components/
│   │   └── PrivateRoute.tsx      # Protected route wrapper
│   ├── contexts/
│   │   └── AuthContext.tsx       # Authentication context
│   ├── features/
│   │   ├── expenses/             # Expenses feature (tags + month grouping)
│   │   └── uploads/              # Uploads feature
│   ├── firebase/
│   │   └── config.ts             # Firebase configuration
│   ├── pages/
│   │   ├── Home.tsx              # Main task tracking page
│   │   ├── Login.tsx             # Login page
│   │   ├── Register.tsx          # Registration page
│   │   ├── CreateTask.tsx        # Task creation page
│   │   ├── TaskCalendar.tsx      # Individual task calendar
│   │   ├── DiaryCalendar.tsx     # Diary calendar view
│   │   ├── DiaryEntry.tsx        # Diary entry editor
│   │   ├── Expenses.tsx          # This-month expenses dashboard
│   │   ├── ExpenseTags.tsx       # Expense tag management page
│   │   └── ExpensesCalendar.tsx  # Month navigation expense calendar
│   ├── utils/
│   │   └── dateUtils.ts          # Date formatting utilities
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── public/
├── package.json
└── README.md
```

## Firestore Data Model

### Collections

#### `tasks`

```typescript
{
  id: string;
  name: string;
  userId: string;
  completedDates: string[];  // Array of YYYY-MM-DD dates
}
```

#### `diary_entries`

```typescript
{
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `diary_placeholders`

```typescript
{
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  hasEntry: boolean;
}
```

#### `expense_tags`

```typescript
{
  id: string;
  userId: string;
  name: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
```

#### `expenses`

```typescript
{
  id: string;
  userId: string;
  amount: number;
  note: string;
  date: string; // YYYY-MM-DD
  tagIds: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
```

## Performance Optimizations

- **Diary Caching**: Month-based placeholder caching reduces Firestore reads
- **Lazy Loading**: Full diary content only loads when viewing specific entries
- **Optimized Queries**: Range queries fetch only relevant data for current view

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## Deployment

You can deploy this app to any static hosting service:

- **Firebase Hosting**: `firebase deploy`
- **Vercel**: Connect your GitHub repo
- **Netlify**: Drag and drop the `dist` folder

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
