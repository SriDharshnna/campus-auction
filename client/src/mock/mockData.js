/**
 * ISOLATED MOCK DATA FOR PROTOTYPE FRONTEND (MODULE 2)
 *
 * NOTE: This data is strictly for frontend rendering and verification before
 * the backend MongoDB and REST endpoints are wired in subsequent modules.
 * Real API services are abstracted in `src/services/api.js`.
 */

export const CATEGORIES = [
  { id: 'all', label: 'All Items', icon: 'Grid' },
  { id: 'cycles', label: 'Bicycles & Mobility', icon: 'Bike' },
  { id: 'electronics', label: 'Electronics & Laptops', icon: 'Laptop' },
  { id: 'textbooks', label: 'Textbooks & Study', icon: 'BookOpen' },
  { id: 'calculators', label: 'Calculators & Kits', icon: 'Calculator' },
  { id: 'dorm', label: 'Dorm & Mattresses', icon: 'Home' },
  { id: 'lab', label: 'Lab & Engineering', icon: 'Compass' },
];

export const MOCK_AUCTIONS = [
  {
    id: 'auc-001',
    title: 'Firefox 21-Speed Mountain Gear Bicycle',
    description: 'Well-maintained gear cycle used for 2 semesters. Brand new brake pads, Shimano gears, includes combination wire lock and bell. Ideal for riding between academic block and dorms.',
    category: 'cycles',
    condition: 'Good Condition',
    imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
    startingPrice: 3500,
    currentPrice: 4200,
    minIncrement: 200,
    bidsCount: 6,
    seller: {
      id: 'usr-101',
      name: 'Rohan Sharma',
      department: 'Mechanical Engg',
      batch: 'Class of 2026',
      rating: 4.9,
    },
    pickupLocation: 'Hostel 4 Ground Floor / Main Gate',
    // Closes in 45 minutes for live countdown demo
    closingAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    status: 'active',
    bidHistory: [
      { id: 'bid-1', bidderName: 'Student ***42', amount: 3500, time: '2 hours ago' },
      { id: 'bid-2', bidderName: 'Student ***18', amount: 3700, time: '1 hour ago' },
      { id: 'bid-3', bidderName: 'Student ***89', amount: 3900, time: '40 mins ago' },
      { id: 'bid-4', bidderName: 'Student ***42', amount: 4200, time: '15 mins ago' },
    ],
    questions: [
      {
        id: 'q-1',
        asker: 'Aryan K.',
        question: 'Are both tires holding pressure without any punctures?',
        answer: 'Yes! Replaced the rear tube last month, zero air leaks.',
        time: '3 hours ago'
      }
    ]
  },
  {
    id: 'auc-002',
    title: 'Casio fx-991EX Scientific Classwiz Calculator',
    description: 'Essential calculator for engineering math and physics. Has 552 functions, QR code generator, and solar dual power. Pristine condition with protective sliding lid.',
    category: 'calculators',
    condition: 'Like New',
    imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80',
    startingPrice: 800,
    currentPrice: 1150,
    minIncrement: 50,
    bidsCount: 8,
    seller: {
      id: 'usr-102',
      name: 'Pooja Iyer',
      department: 'Electronics & Comm',
      batch: 'Class of 2026',
      rating: 5.0,
    },
    pickupLocation: 'Library Courtyard',
    // Closes in 18 minutes (Closing soon demo)
    closingAt: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
    status: 'active',
    bidHistory: [
      { id: 'bid-21', bidderName: 'Student ***55', amount: 800, time: '3 hours ago' },
      { id: 'bid-22', bidderName: 'Student ***31', amount: 950, time: '2 hours ago' },
      { id: 'bid-23', bidderName: 'Student ***77', amount: 1100, time: '30 mins ago' },
      { id: 'bid-24', bidderName: 'Student ***02', amount: 1150, time: '5 mins ago' },
    ],
    questions: []
  },
  {
    id: 'auc-003',
    title: 'Thomas Calculus (14th Edition) & Halliday-Resnick Physics Set',
    description: 'Standard textbook bundle for 1st/2nd year undergrads. Crisp pages, no markings or pen highlights, comes with solved exercise solutions handbook.',
    category: 'textbooks',
    condition: 'Gently Used',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    startingPrice: 1200,
    currentPrice: 1500,
    minIncrement: 100,
    bidsCount: 4,
    seller: {
      id: 'usr-103',
      name: 'Vikram Das',
      department: 'Computer Science',
      batch: 'Class of 2026',
      rating: 4.8,
    },
    pickupLocation: 'Academic Complex Atrium',
    // Closes in 2 days
    closingAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    bidHistory: [
      { id: 'bid-31', bidderName: 'Student ***64', amount: 1200, time: '5 hours ago' },
      { id: 'bid-32', bidderName: 'Student ***12', amount: 1500, time: '1 hour ago' },
    ],
    questions: [
      {
        id: 'q-2',
        asker: 'Divya M.',
        question: 'Does this edition have the multivariable calculus chapters?',
        answer: 'Yes, covers Single and Multivariable calculus completely.',
        time: '4 hours ago'
      }
    ]
  },
  {
    id: 'auc-004',
    title: 'Dell 24-inch IPS 75Hz Monitor with HDMI Cable',
    description: 'Perfect secondary monitor for dorm desk setups and coding projects. Full HD 1080p, ultra-thin bezels, blue light filter, zero dead pixels.',
    category: 'electronics',
    condition: 'Excellent',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    startingPrice: 4500,
    currentPrice: 5800,
    minIncrement: 250,
    bidsCount: 11,
    seller: {
      id: 'usr-101',
      name: 'Rohan Sharma',
      department: 'Mechanical Engg',
      batch: 'Class of 2026',
      rating: 4.9,
    },
    pickupLocation: 'Hostel 4 Ground Floor',
    // Closes in 28 minutes (Closing soon demo)
    closingAt: new Date(Date.now() + 28 * 60 * 1000).toISOString(),
    status: 'active',
    bidHistory: [
      { id: 'bid-41', bidderName: 'Student ***90', amount: 4500, time: '6 hours ago' },
      { id: 'bid-42', bidderName: 'Student ***21', amount: 5000, time: '3 hours ago' },
      { id: 'bid-43', bidderName: 'Student ***74', amount: 5500, time: '1 hour ago' },
      { id: 'bid-44', bidderName: 'Student ***88', amount: 5800, time: '12 mins ago' },
    ],
    questions: []
  },
  {
    id: 'auc-005',
    title: 'Orthopedic Single Bed Mattress with Washable Cover',
    description: 'Standard single bed size fitted for campus hostel cots (72x36 inches). Purchased last academic year, sanitized, includes zippered dust cover.',
    category: 'dorm',
    condition: 'Clean / Good',
    imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
    startingPrice: 1500,
    currentPrice: 1800,
    minIncrement: 100,
    bidsCount: 3,
    seller: {
      id: 'usr-104',
      name: 'Sneha Patel',
      department: 'Chemical Engg',
      batch: 'Class of 2026',
      rating: 4.7,
    },
    pickupLocation: 'Hostel 8 Common Room',
    // Closes in 3 days
    closingAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    bidHistory: [
      { id: 'bid-51', bidderName: 'Student ***34', amount: 1500, time: '1 day ago' },
      { id: 'bid-52', bidderName: 'Student ***19', amount: 1800, time: '18 hours ago' },
    ],
    questions: []
  },
  {
    id: 'auc-006',
    title: 'Arduino Mega 2560 Sensor & Robotics Kit',
    description: 'Complete embedded systems lab kit with ultrasonic sensors, servo motors, LCD display, breadboard, and jumper wires. Used for 3rd year IoT project.',
    category: 'lab',
    condition: 'Like New',
    imageUrl: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80',
    startingPrice: 1400,
    currentPrice: 1400,
    minIncrement: 100,
    bidsCount: 0,
    seller: {
      id: 'usr-103',
      name: 'Vikram Das',
      department: 'Computer Science',
      batch: 'Class of 2026',
      rating: 4.8,
    },
    pickupLocation: 'CS Department Lab Corridor',
    // Closes in 4 days
    closingAt: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    bidHistory: [],
    questions: []
  }
];

export const MOCK_USER = {
  id: 'usr-current',
  name: 'Kavya Nair',
  email: 'kavya.nair@campus.edu',
  studentId: '2023CSB1042',
  department: 'Computer Science',
  batch: 'Class of 2027',
  campusRating: 5.0,
  unreadNotificationsCount: 3
};

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'Outbid Alert',
    message: 'Someone placed a higher bid of ₹4,200 on "Firefox 21-Speed Mountain Gear Bicycle".',
    timestamp: '15 minutes ago',
    read: false,
    type: 'outbid',
    link: '/auctions/auc-001'
  },
  {
    id: 'notif-2',
    title: 'Auction Closing Soon',
    message: '"Casio fx-991EX Scientific Classwiz Calculator" closes in less than 20 minutes!',
    timestamp: '25 minutes ago',
    read: false,
    type: 'closing_soon',
    link: '/auctions/auc-002'
  },
  {
    id: 'notif-3',
    title: 'Seller Approved Your Winning Bid',
    message: 'Seller confirmed your winning bid for "Room Heater 1000W". Coordinate campus handover.',
    timestamp: '2 hours ago',
    read: false,
    type: 'approval',
    link: '/dashboard'
  },
  {
    id: 'notif-4',
    title: 'New Bid on Your Listing',
    message: 'A student placed a bid of ₹1,150 on your calculator auction.',
    timestamp: '5 hours ago',
    read: true,
    type: 'bid_received',
    link: '/dashboard'
  }
];

export const MOCK_SAVED_SEARCHES = [
  {
    id: 'ss-1',
    query: 'Bicycle gear',
    category: 'cycles',
    maxPrice: 5000,
    emailAlerts: true,
    created: 'Oct 24, 2026'
  },
  {
    id: 'ss-2',
    query: 'Ergonomic chair',
    category: 'dorm',
    maxPrice: 2500,
    emailAlerts: false,
    created: 'Oct 26, 2026'
  },
  {
    id: 'ss-3',
    query: 'Raspberry Pi',
    category: 'electronics',
    maxPrice: 3500,
    emailAlerts: true,
    created: 'Oct 27, 2026'
  }
];
