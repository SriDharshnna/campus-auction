import Auction from '../models/Auction.js';
import User from '../models/User.js';

export const seedInitialAuctionsIfEmpty = async () => {
  try {
    const count = await Auction.countDocuments();
    if (count > 0) return;

    console.log('[Seeder] No auctions found in MongoDB. Seeding initial campus catalog...');

    // Find or create a default demo senior student seller
    let seller = await User.findOne({ email: 'rohan.sharma@campus.edu' });
    if (!seller) {
      seller = new User({
        name: 'Rohan Sharma',
        email: 'rohan.sharma@campus.edu',
        studentId: '23CSR101',
        department: 'Computer Science & Engineering',
        password: 'CampusPassword2026'
      });
      await seller.save();
    }

    const initialAuctions = [
      {
        title: 'Firefox 21-Speed Mountain Gear Bicycle',
        description: 'Well-maintained gear cycle used for 2 semesters. Brand new brake pads, Shimano gears, includes combination wire lock and bell. Ideal for riding between academic block and dorms.',
        category: 'cycles',
        condition: 'Good Condition',
        imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
        startingPrice: 3500,
        currentPrice: 3500,
        minIncrement: 200,
        bidsCount: 0,
        seller: seller._id,
        sellerName: seller.name,
        sellerDepartment: seller.department,
        sellerRoll: seller.studentId,
        pickupLocation: 'Hostel 4 Ground Floor / Main Gate',
        closingAt: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes
        status: 'active',
        questions: [
          {
            askerName: 'Aryan K.',
            question: 'Are both tires holding pressure without any punctures?',
            answer: 'Yes! Replaced the rear tube last month, zero air leaks.',
            answeredAt: new Date(Date.now() - 3600 * 1000)
          }
        ]
      },
      {
        title: 'Casio fx-991EX Scientific Classwiz Calculator',
        description: 'Essential calculator for engineering math and physics. Has 552 functions, QR code generator, and solar dual power. Pristine condition with protective sliding lid.',
        category: 'calculators',
        condition: 'Like New',
        imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80',
        startingPrice: 800,
        currentPrice: 800,
        minIncrement: 50,
        bidsCount: 0,
        seller: seller._id,
        sellerName: seller.name,
        sellerDepartment: seller.department,
        sellerRoll: seller.studentId,
        pickupLocation: 'Library Courtyard',
        closingAt: new Date(Date.now() + 25 * 60 * 1000), // 25 minutes
        status: 'active',
        questions: []
      },
      {
        title: 'Thomas Calculus (14th Edition) & Physics Bundle',
        description: 'Standard textbook bundle for 1st/2nd year undergrads. Crisp pages, no markings or pen highlights, comes with solved exercise solutions handbook.',
        category: 'textbooks',
        condition: 'Good Condition',
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
        startingPrice: 1200,
        currentPrice: 1200,
        minIncrement: 100,
        bidsCount: 0,
        seller: seller._id,
        sellerName: seller.name,
        sellerDepartment: seller.department,
        sellerRoll: seller.studentId,
        pickupLocation: 'Academic Complex Atrium',
        closingAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days
        status: 'active',
        questions: []
      },
      {
        title: 'Dell 24-inch IPS 75Hz Monitor with HDMI Cable',
        description: 'Perfect secondary monitor for dorm desk setups and coding projects. Full HD 1080p, ultra-thin bezels, blue light filter, zero dead pixels.',
        category: 'electronics',
        condition: 'Excellent',
        imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
        startingPrice: 4500,
        currentPrice: 4500,
        minIncrement: 250,
        bidsCount: 0,
        seller: seller._id,
        sellerName: seller.name,
        sellerDepartment: seller.department,
        sellerRoll: seller.studentId,
        pickupLocation: 'Hostel 4 Ground Floor',
        closingAt: new Date(Date.now() + 35 * 60 * 1000), // 35 minutes
        status: 'active',
        questions: []
      },
      {
        title: 'Orthopedic Single Bed Mattress with Washable Cover',
        description: 'Standard single bed size fitted for campus hostel cots (72x36 inches). Purchased last academic year, sanitized, includes zippered dust cover.',
        category: 'dorm',
        condition: 'Good Condition',
        imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
        startingPrice: 1500,
        currentPrice: 1500,
        minIncrement: 100,
        bidsCount: 0,
        seller: seller._id,
        sellerName: seller.name,
        sellerDepartment: seller.department,
        sellerRoll: seller.studentId,
        pickupLocation: 'Hostel 8 Common Room',
        closingAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 3 days
        status: 'active',
        questions: []
      },
      {
        title: 'Arduino Mega 2560 Sensor & Robotics Kit',
        description: 'Complete embedded systems lab kit with ultrasonic sensors, servo motors, LCD display, breadboard, and jumper wires. Used for IoT project.',
        category: 'lab',
        condition: 'Like New',
        imageUrl: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80',
        startingPrice: 1400,
        currentPrice: 1400,
        minIncrement: 100,
        bidsCount: 0,
        seller: seller._id,
        sellerName: seller.name,
        sellerDepartment: seller.department,
        sellerRoll: seller.studentId,
        pickupLocation: 'CS Department Lab Corridor',
        closingAt: new Date(Date.now() + 96 * 60 * 60 * 1000), // 4 days
        status: 'active',
        questions: []
      }
    ];

    await Auction.insertMany(initialAuctions);
    console.log(`[Seeder] Seeded ${initialAuctions.length} initial campus auctions into MongoDB.`);
  } catch (err) {
    console.error('[Seeder] Error seeding auctions:', err.message);
  }
};
