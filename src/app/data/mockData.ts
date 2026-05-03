export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "lecturer" | "admin";
  department: string;
  avatar?: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  type:
    | "classroom"
    | "lecture-hall"
    | "lab"
    | "meeting-room"
    | "seminar-room";
  facilities: string[];
  image: string;
  isAvailable: boolean;
  isMaintenance: boolean;
}

export interface Booking {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  roomName: string;
  building: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  attendees: number;
  status: "confirmed" | "pending" | "rejected" | "cancelled";
  equipment: string[];
  notes?: string;
  isRecurring: boolean;
  rejectReason?: string;
}

export interface Notification {
  id: string;
  type: "booking" | "approval" | "cancellation" | "reminder";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

// Current user
export const currentUser: User = {
  id: "1",
  name: "Arry",
  email: "arry@university.edu",
  role: "admin",
  department: "Computer Science",
};

// Prebuilt users for testing
export const studentUser: User = {
  id: "2",
  name: "Jesse Pinkman",
  email: "jesse@university.edu",
  role: "student",
  department: "Computer Science",
};

export const lecturerUser: User = {
  id: "3",
  name: "Prof. Panji",
  email: "panji@university.edu",
  role: "lecturer",
  department: "Engineering",
};

// All available demo users
export const demoUsers: User[] = [currentUser, studentUser, lecturerUser];

// Sample rooms
export const rooms: Room[] = [
  {
    id: "r1",
    name: "Microteaching Lab 19F-20",
    building: "Lavenue Building, 19th Floor",
    floor: 19,
    capacity: 20,
    type: "classroom",
    facilities: ["Projector", "Whiteboard", "AC", "WiFi"],
    image:
      "https://res.cloudinary.com/dcmdkdwlw/image/upload/q_auto/f_auto/v1777395269/room19f-04_sbifsb.jpg",
    isAvailable: true,
    isMaintenance: false,
  },
  {
    id: "r2",
    name: "Room 19F-01",
    building: "Lavenue Building, 19th Floor",
    floor: 19,
    capacity: 40,
    type: "lecture-hall",
    facilities: [
      "Projector",
      "Microphone",
      "AC",
      "WiFi",
      "Recording Equipment",
    ],
    image:
      "https://res.cloudinary.com/dcmdkdwlw/image/upload/v1777395616/19f-04_nlhid9.jpg",
    isAvailable: true,
    isMaintenance: false,
  },
  {
    id: "r3",
    name: "Room 19F-02",
    building: "Lavenue Building, 19th Floor",
    floor: 19,
    capacity: 40,
    type: "lecture-hall",
    facilities: [
      "Computers",
      "Projector",
      "AC",
      "WiFi",
      "Software Lab",
    ],
    image:
      "https://res.cloudinary.com/dcmdkdwlw/image/upload/q_auto/f_auto/v1777470349/19f-04_rg4h0a.jpg",
    isAvailable: false,
    isMaintenance: false,
  },
  {
    id: "r4",
    name: "Room 19F-03",
    building: "Lavenue Building, 19th Floor",
    floor: 19,
    capacity: 40,
    type: "lecture-hall",
    facilities: [
      "TV Display",
      "Whiteboard",
      "AC",
      "WiFi",
      "Conference Phone",
    ],
    image:
      "https://res.cloudinary.com/dcmdkdwlw/image/upload/q_auto/f_auto/v1777470349/19f-03_fkklcu.jpg",
    isAvailable: true,
    isMaintenance: false,
  },
  {
    id: "r5",
    name: "Room 19F-04",
    building: "Lavenue Building, 19th Floor",
    floor: 19,
    capacity: 50,
    type: "seminar-room",
    facilities: [
      "Projector",
      "Whiteboard",
      "AC",
      "WiFi",
      "Sound System",
    ],
    image:
      "https://res.cloudinary.com/dcmdkdwlw/image/upload/q_auto/f_auto/v1777470349/19f-04_rg4h0a.jpg",
    isAvailable: true,
    isMaintenance: false,
  },
  {
    id: "r6",
    name: "Room 7F-01",
    building: "Lavenue Building, 7th Floor",
    floor: 7,
    capacity: 10,
    type: "classroom",
    facilities: ["Projector", "Whiteboard", "AC", "WiFi"],
    image:
      "https://res.cloudinary.com/dcmdkdwlw/image/upload/q_auto/f_auto/v1777470349/19f-02_sq5kq6.jpg",
    isAvailable: true,
    isMaintenance: false,
  },
  {
    id: "r7",
    name: "Manufacturing Lab",
    building: "LG Lab Building",
    floor: -1,
    capacity: 25,
    type: "lab",
    facilities: [
      "Lab Equipment",
      "Whiteboard",
      "AC",
      "WiFi",
      "Safety Equipment",
    ],
    image:
      "https://res.cloudinary.com/dcmdkdwlw/image/upload/q_auto/f_auto/v1777471889/download_wbij9i.webp",
    isAvailable: false,
    isMaintenance: true,
  },
  {
    id: "r8",
    name: "Room 7F-02",
    building: "Lavenue Building, 7th Floor",
    floor: 7,
    capacity: 20,
    type: "classroom",
    facilities: [
      "Projector",
      "Microphone",
      "AC",
      "WiFi",
      "Recording Equipment",
      "Stage",
    ],
    image:
      "https://res.cloudinary.com/dcmdkdwlw/image/upload/q_auto/f_auto/v1777470349/19f-01_i4uiuq.jpg",
    isAvailable: true,
    isMaintenance: false,
  },
];

// Sample bookings
export const bookings: Booking[] = [
  {
    id: "b1",
    roomId: "r1",
    userId: "1",
    userName: "Sarah Johnson",
    roomName: "Microteaching Lab 19F-20",
    building: "Lavenue Building, 19th Floor",
    date: "2026-04-02",
    startTime: "10:00",
    endTime: "12:00",
    purpose: "Study Group Session",
    attendees: 15,
    status: "confirmed",
    equipment: ["Projector"],
    notes: "Working on group project",
    isRecurring: false,
  },
  {
    id: "b2",
    roomId: "r2",
    userId: "1",
    userName: "Sarah Johnson",
    roomName: "Room 19F-01",
    building: "Lavenue Building, 19th Floor",
    date: "2026-04-03",
    startTime: "14:00",
    endTime: "16:00",
    purpose: "Workshop Presentation",
    attendees: 35,
    status: "pending",
    equipment: ["Projector", "Microphone"],
    notes: "Student workshop on presentation skills",
    isRecurring: false,
  },
  {
    id: "b3",
    roomId: "r4",
    userId: "1",
    userName: "Sarah Johnson",
    roomName: "Room 19F-03",
    building: "Lavenue Building, 19th Floor",
    date: "2026-04-05",
    startTime: "09:00",
    endTime: "10:30",
    purpose: "Team Meeting",
    attendees: 12,
    status: "confirmed",
    equipment: ["Whiteboard"],
    notes: "Project coordination meeting",
    isRecurring: true,
  },
  {
    id: "b4",
    roomId: "r5",
    userId: "2",
    userName: "Prof. Michael Chen",
    roomName: "Room 19F-04",
    building: "Lavenue Building, 19th Floor",
    date: "2026-04-06",
    startTime: "13:00",
    endTime: "15:00",
    purpose: "Guest Lecture",
    attendees: 40,
    status: "confirmed",
    equipment: ["Projector", "Sound System"],
    notes: "Guest speaker session for library event",
    isRecurring: false,
  },
  {
    id: "b5",
    roomId: "r3",
    userId: "3",
    userName: "Dr. Emily White",
    roomName: "Room 19F-02",
    building: "Lavenue Building, 19th Floor",
    date: "2026-04-04",
    startTime: "15:00",
    endTime: "17:00",
    purpose: "Tutorial Session",
    attendees: 20,
    status: "confirmed",
    equipment: ["Computers"],
    notes: "Hands-on software lab practice",
    isRecurring: false,
  },
];

// Sample notifications
export const notifications: Notification[] = [
  {
    id: "n1",
    type: "booking",
    title: "Booking Confirmed",
    message:
      "Your booking for Microteaching Lab 19F-20 on April 2 has been confirmed.",
    timestamp: "2026-03-31T09:30:00",
    read: false,
    link: "/bookings",
  },
  {
    id: "n2",
    type: "approval",
    title: "Approval Pending",
    message:
      "Your booking for Room 19F-01 is pending approval.",
    timestamp: "2026-03-31T08:15:00",
    read: false,
    link: "/admin/approvals",
  },
  {
    id: "n3",
    type: "reminder",
    title: "Upcoming Booking",
    message:
      "Reminder: You have a booking tomorrow at 10:00 AM in Microteaching Lab 19F-20.",
    timestamp: "2026-03-30T18:00:00",
    read: true,
    link: "/bookings",
  },
  {
    id: "n4",
    type: "booking",
    title: "New Feature Available",
    message:
      "You can now mark rooms as favorites for quick access!",
    timestamp: "2026-03-29T10:00:00",
    read: true,
    link: "/rooms",
  },
];

// Analytics data
export const analyticsData = {
  totalBookings: 1247,
  roomUtilization: 78,
  pendingApprovals: 23,
  activeRooms: 45,
  weeklyBookings: [
    { day: "Mon", bookings: 45 },
    { day: "Tue", bookings: 52 },
    { day: "Wed", bookings: 48 },
    { day: "Thu", bookings: 61 },
    { day: "Fri", bookings: 38 },
    { day: "Sat", bookings: 15 },
    { day: "Sun", bookings: 8 },
  ],
  utilizationByHour: [
    { hour: "8:00", utilization: 25 },
    { hour: "9:00", utilization: 45 },
    { hour: "10:00", utilization: 72 },
    { hour: "11:00", utilization: 85 },
    { hour: "12:00", utilization: 60 },
    { hour: "13:00", utilization: 55 },
    { hour: "14:00", utilization: 78 },
    { hour: "15:00", utilization: 82 },
    { hour: "16:00", utilization: 68 },
    { hour: "17:00", utilization: 45 },
    { hour: "18:00", utilization: 30 },
  ],
  topRooms: [
    { name: "Microteaching Lab 19F-20", bookings: 156 },
    { name: "Room 19F-01", bookings: 142 },
    { name: "Room 19F-03", bookings: 128 },
    { name: "Room 19F-04", bookings: 98 },
    { name: "Room 19F-02", bookings: 87 },
  ],
};

// Time slots for availability calendar
export const generateTimeSlots = () => {
  const times = [];
  for (let hour = 8; hour <= 18; hour++) {
    times.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < 18) {
      times.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }
  return times;
};

export const buildings = [
  "All Buildings",
  "Engineering Block A",
  "Engineering Block B",
  "Main Building",
  "Science Block",
  "Library Building",
  "Administration Block",
];

export const roomTypes = [
  "classroom",
  "lecture-hall",
  "lab",
  "meeting-room",
  "seminar-room",
];

export const allFacilities = [
  "Projector",
  "Whiteboard",
  "AC",
  "WiFi",
  "Microphone",
  "Recording Equipment",
  "Computers",
  "Software Lab",
  "TV Display",
  "Conference Phone",
  "Sound System",
  "Lab Equipment",
  "Safety Equipment",
  "Stage",
];