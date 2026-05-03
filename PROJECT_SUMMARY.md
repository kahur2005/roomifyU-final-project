# RoomifyU - University Room Booking System

A modern, comprehensive university room-booking web application built with React, TypeScript, Tailwind CSS, and React Router.

## 🎨 Design System

### Colors
- **Primary**: #2563EB (Blue)
- **Secondary**: #0F172A (Dark Navy)
- **Accent**: #22C55E (Green for availability)
- **Background**: #F8FAFC (Light Gray)
- **Destructive**: #EF4444 (Red)

### Typography
- Clean sans-serif design
- Consistent font weights and sizes
- Accessible WCAG-compliant contrast

## 📱 Pages & Features

### Public Pages
1. **Login Page** (`/login`)
   - University SSO option
   - Email/password login
   - Forgot password link
   - Clean centered card layout with university illustration

2. **Forgot Password** (`/forgot-password`)
   - Email recovery form
   - Confirmation state

### User Pages
3. **Dashboard** (`/dashboard`)
   - Welcome header with user avatar
   - Quick stats cards (Upcoming Bookings, Available Rooms, Pending Approvals, Confirmed)
   - Recent bookings grid
   - Quick action buttons

4. **Room Search & Discovery** (`/rooms`)
   - Prominent search bar
   - Advanced filters panel:
     - Building dropdown
     - Capacity slider
     - Room type checkboxes
     - Facilities multi-select
   - Results grid with room cards
   - Favorite rooms feature
   - Empty state design
   - Mobile-responsive filter modal

5. **Room Detail Page** (`/room/:roomId`)
   - Large room image gallery
   - Room information (capacity, facilities, location)
   - Interactive availability calendar
   - Color-coded time slots (Green=Available, Red=Booked, Yellow=Pending)
   - Sticky "Book This Room" button
   - Favorite toggle

6. **Booking Flow** (Multi-step modal)
   - Step 1: Date & time selection with interactive picker
   - Step 2: Booking details form (purpose, attendees, equipment, recurring option, notes)
   - Step 3: Review & confirm with summary

7. **My Bookings** (`/bookings`)
   - Tabs for Upcoming and Past bookings
   - Search and status filters
   - Booking cards with actions (View, Edit, Cancel)
   - Empty states

8. **Profile & Settings** (`/profile`)
   - Profile photo and personal information
   - Change password form
   - Notification preferences with toggles
   - Department information

### Admin Pages
9. **Admin Dashboard** (`/admin`)
   - KPI cards (Total Bookings, Room Utilization, Pending Approvals, Active Rooms)
   - Weekly bookings bar chart
   - Peak hours line chart
   - Recent booking requests table
   - Top 5 most booked rooms

10. **Approval Management** (`/admin/approvals`)
    - Sortable table of booking requests
    - Status filters
    - Quick approve/reject actions
    - Detailed booking slide-over panel
    - Rejection reason modal

11. **Room Management** (`/admin/rooms`)
    - Room list table with search and filters
    - Add/Edit room dialog with:
      - Building, floor, room name/number
      - Capacity and room type
      - Facilities checklist
      - Maintenance toggle
    - Delete room functionality

12. **Analytics & Reports** (`/admin/analytics`)
    - Comprehensive charts:
      - Weekly booking trends
      - Room utilization pie chart
      - Peak hours analysis
      - Bookings by room type
    - Date range selector
    - Export buttons (CSV/PDF)
    - Key insights section
    - Top performing rooms

## 🔧 Components

### Reusable Components
- **StatusBadge**: Color-coded status indicators
- **RoomCard**: Room display with image, details, and favorite toggle
- **BookingCard**: Booking information with action menu
- **AppLayout**: Main layout with sidebar navigation and mobile menu
- **MobileNav**: Bottom navigation for mobile devices

### UI Components (Shadcn/ui)
- Buttons, Inputs, Cards, Tables
- Dialogs, Sheets, Dropdowns
- Calendar, Tabs, Badges
- Checkboxes, Sliders, Switches
- Toast notifications (Sonner)

## 📊 Data Structure

Mock data includes:
- Users (students, lecturers, admins)
- Rooms (8 different rooms across 6 buildings)
- Bookings (with various statuses)
- Notifications
- Analytics data
- Available facilities

## 🎯 Key Features

### UX Enhancements
- ⭐ Favorite rooms feature
- 🔁 Quick rebook functionality
- 📭 Helpful empty states
- ⏳ Loading skeletons ready
- 🎉 Toast success/error messages
- 🚫 Visual double booking prevention
- 🎨 Clear color legend for calendar

### Responsive Design
- Mobile-first approach
- Bottom sticky navigation on mobile
- Collapsible filters in modal for mobile
- Touch-friendly time picker
- Simplified mobile navigation
- Responsive grid layouts

### Accessibility
- WCAG-compliant color contrast
- Large click targets
- Keyboard navigable components
- Proper form labels
- Screen reader friendly

### Role-Based Access
- Student/User view
- Lecturer/Staff view
- Admin dashboard and controls

## 🛣️ Routing

Uses React Router's Data mode pattern:
- Nested routes with AppLayout
- Protected admin routes
- Clean URL structure

## 🎨 Styling

- Tailwind CSS v4
- Custom theme with CSS variables
- Consistent spacing and borders (12-16px radius)
- Soft shadows
- Smooth transitions and hover states

## 📦 Technology Stack

- **Framework**: React 18
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **UI Components**: Shadcn/ui (Radix UI)
- **Form Handling**: React Hook Form
- **Notifications**: Sonner
- **Date Handling**: date-fns
- **Animations**: Motion (Framer Motion)

## 🚀 Getting Started

The application starts at `/login` and navigates to `/dashboard` after authentication.

Default user: Sarah Johnson (Student role)
- Can be changed to Admin role to access admin features in `mockData.ts`

## 💡 Future Enhancements (Supabase Integration)

This frontend-only application would benefit from Supabase for:
- Real user authentication
- Persistent booking data
- Real-time availability updates
- Push notifications
- File uploads (room images)
- Analytics data storage

Note: Figma Make is not meant for collecting PII or securing sensitive data. For production use, integrate with a secure backend service.
