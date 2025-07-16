const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pocketwatcher';

// Import schemas (you'll need to extract these from server.js)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['organizer', 'vendor'], required: true },
  location: {
    emirate: { 
      type: String, 
      enum: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'],
      required: true 
    },
    city: String,
    address: String
  },
  profile: {
    avatar: String,
    bio: String,
    phone: String,
    whatsapp: String
  },
  businessName: String,
  services: [String],
  category: { 
    type: String, 
    enum: ['catering', 'decoration', 'photography', 'entertainment', 'venue', 'transportation', 'flowers', 'audio_visual', 'security', 'other'] 
  },
  pricing: {
    priceRange: {
      min: Number,
      max: Number
    },
    packages: [{
      name: String,
      description: String,
      price: Number,
      includes: [String]
    }]
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  portfolio: [{
    title: String,
    description: String,
    images: [String],
    date: Date
  }],
  organizationType: { 
    type: String, 
    enum: ['student', 'freelancer', 'sme_owner', 'individual'] 
  },
  financialLiteracy: {
    level: { type: String, enum: ['basic', 'intermediate', 'advanced'], default: 'basic' },
    needsGuidance: { type: Boolean, default: true }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventType: {
    type: String,
    enum: ['wedding', 'corporate', 'birthday', 'conference', 'seminar', 'networking', 'graduation', 'other'],
    required: true
  },
  date: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  location: {
    emirate: String,
    city: String,
    address: String,
    venue: String
  },
  attendees: {
    expected: { type: Number, required: true },
    confirmed: { type: Number, default: 0 }
  },
  totalBudget: { type: Number, required: true },
  budgetCategories: [{
    name: String,
    allocated: Number,
    spent: { type: Number, default: 0 }
  }],
  vendorRequests: [{
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    service: String,
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'completed'], default: 'pending' },
    requestedPrice: Number,
    quotedPrice: Number,
    finalPrice: Number,
    notes: String,
    requestedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['planning', 'confirmed', 'ongoing', 'completed', 'cancelled'],
    default: 'planning'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const venueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  venueType: {
    type: String,
    enum: ['hotel', 'restaurant', 'hall', 'outdoor', 'beach', 'mall', 'office', 'home', 'other'],
    required: true
  },
  location: {
    emirate: { type: String, required: true },
    city: String,
    address: { type: String, required: true }
  },
  capacity: {
    minimum: Number,
    maximum: Number
  },
  amenities: [String],
  pricing: {
    basePrice: Number,
    priceType: { type: String, enum: ['per_hour', 'per_day', 'per_event'] }
  },
  contact: {
    phone: String,
    email: String,
    manager: String
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const Venue = mongoose.model('Venue', venueSchema);

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Event.deleteMany({});
    await Venue.deleteMany({});
    console.log('Cleared existing data');

    // Hash password for demo users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create sample organizers
    const organizers = await User.create([
      {
        name: 'Sarah Ahmed',
        email: 'sarah@example.com',
        password: hashedPassword,
        userType: 'organizer',
        location: {
          emirate: 'Dubai',
          city: 'Dubai Marina',
          address: 'Marina Walk, Dubai'
        },
        organizationType: 'individual',
        profile: {
          bio: 'Event planning enthusiast specializing in weddings and corporate events',
          phone: '+971-50-123-4567',
          whatsapp: '+971-50-123-4567'
        }
      },
      {
        name: 'Ahmed Al-Mansoori',
        email: 'ahmed@example.com',
        password: hashedPassword,
        userType: 'organizer',
        location: {
          emirate: 'Abu Dhabi',
          city: 'Abu Dhabi',
          address: 'Corniche Road, Abu Dhabi'
        },
        organizationType: 'sme_owner',
        profile: {
          bio: 'SME owner organizing regular corporate events and conferences',
          phone: '+971-52-987-6543'
        }
      }
    ]);

    // Create sample vendors
    const vendors = await User.create([
      {
        name: 'Fatima Hassan',
        email: 'fatima@deluxecatering.ae',
        password: hashedPassword,
        userType: 'vendor',
        businessName: 'Deluxe Catering Services',
        category: 'catering',
        services: ['Arabic Cuisine', 'International Buffet', 'Live Cooking Stations', 'Dessert Catering'],
        location: {
          emirate: 'Dubai',
          city: 'Al Quoz',
          address: 'Al Quoz Industrial Area, Dubai'
        },
        pricing: {
          priceRange: { min: 50, max: 200 },
          packages: [
            {
              name: 'Basic Package',
              description: 'Standard buffet with Arabic and international dishes',
              price: 75,
              includes: ['Main dishes', 'Rice', 'Salads', 'Dessert', 'Service staff']
            },
            {
              name: 'Premium Package',
              description: 'Luxury dining experience with live cooking',
              price: 150,
              includes: ['Gourmet dishes', 'Live cooking stations', 'Premium desserts', 'Dedicated chef', 'Premium service']
            }
          ]
        },
        rating: { average: 4.8, count: 127 },
        profile: {
          bio: 'Award-winning catering service with 15+ years of experience in UAE',
          phone: '+971-50-555-0101',
          whatsapp: '+971-50-555-0101'
        }
      },
      {
        name: 'Mohammed Al-Rashid',
        email: 'mohammed@elegantevents.ae',
        password: hashedPassword,
        userType: 'vendor',
        businessName: 'Elegant Events Photography',
        category: 'photography',
        services: ['Wedding Photography', 'Corporate Events', 'Portrait Sessions', 'Drone Photography'],
        location: {
          emirate: 'Dubai',
          city: 'DIFC',
          address: 'Dubai International Financial Centre'
        },
        pricing: {
          priceRange: { min: 800, max: 5000 },
          packages: [
            {
              name: 'Basic Coverage',
              description: '4-hour event coverage with edited photos',
              price: 1200,
              includes: ['4 hours coverage', '100+ edited photos', 'Online gallery', 'Basic equipment']
            },
            {
              name: 'Premium Wedding Package',
              description: 'Full day wedding coverage with videography',
              price: 3500,
              includes: ['8+ hours coverage', '500+ photos', 'Highlight video', 'Drone shots', 'Premium editing']
            }
          ]
        },
        rating: { average: 4.9, count: 89 },
        profile: {
          bio: 'Professional photographer specializing in luxury weddings and corporate events',
          phone: '+971-55-777-0202'
        }
      },
      {
        name: 'Aisha Al-Zahra',
        email: 'aisha@bloomingevents.ae',
        password: hashedPassword,
        userType: 'vendor',
        businessName: 'Blooming Events Decoration',
        category: 'decoration',
        services: ['Floral Arrangements', 'Stage Design', 'Lighting Setup', 'Themed Decorations'],
        location: {
          emirate: 'Sharjah',
          city: 'Sharjah',
          address: 'Al Majaz, Sharjah'
        },
        pricing: {
          priceRange: { min: 500, max: 8000 },
          packages: [
            {
              name: 'Basic Decoration',
              description: 'Simple and elegant decoration setup',
              price: 1500,
              includes: ['Centerpieces', 'Basic lighting', 'Entrance decoration', 'Setup & cleanup']
            },
            {
              name: 'Luxury Theme Package',
              description: 'Complete themed decoration with premium flowers',
              price: 5000,
              includes: ['Custom theme design', 'Premium flowers', 'LED lighting', 'Stage backdrop', 'Full venue transformation']
            }
          ]
        },
        rating: { average: 4.7, count: 156 },
        profile: {
          bio: 'Creative decoration specialist bringing your event vision to life',
          phone: '+971-56-888-0303'
        }
      },
      {
        name: 'Khalid Bin Rashid',
        email: 'khalid@soundwaveav.ae',
        password: hashedPassword,
        userType: 'vendor',
        businessName: 'SoundWave Audio Visual',
        category: 'audio_visual',
        services: ['Sound Systems', 'LED Screens', 'Projectors', 'Microphones', 'DJ Equipment'],
        location: {
          emirate: 'Dubai',
          city: 'Business Bay',
          address: 'Business Bay, Dubai'
        },
        pricing: {
          priceRange: { min: 300, max: 3000 },
          packages: [
            {
              name: 'Basic AV Package',
              description: 'Essential audio visual equipment',
              price: 800,
              includes: ['Sound system', 'Wireless mics', 'Basic lighting', 'Technician support']
            },
            {
              name: 'Premium Conference Setup',
              description: 'Professional AV setup for large events',
              price: 2200,
              includes: ['Professional sound', 'LED screens', 'Projectors', 'Live streaming setup', 'Technical crew']
            }
          ]
        },
        rating: { average: 4.6, count: 203 },
        profile: {
          bio: 'Professional AV solutions for corporate and private events',
          phone: '+971-50-999-0404'
        }
      }
    ]);

    // Create sample venues
    const venues = await Venue.create([
      {
        name: 'Grand Ballroom Dubai',
        description: 'Luxurious ballroom perfect for weddings and large celebrations',
        venueType: 'hall',
        location: {
          emirate: 'Dubai',
          city: 'Downtown Dubai',
          address: 'Sheikh Zayed Road, Downtown Dubai'
        },
        capacity: { minimum: 100, maximum: 500 },
        amenities: ['Air Conditioning', 'Parking', 'Catering Kitchen', 'Bridal Suite', 'AV Equipment', 'Valet Service'],
        pricing: {
          basePrice: 8000,
          priceType: 'per_day'
        },
        contact: {
          phone: '+971-4-555-1001',
          email: 'bookings@grandballroomdubai.ae',
          manager: 'Hassan Al-Mahmoud'
        },
        rating: { average: 4.8, count: 89 }
      },
      {
        name: 'Marina Conference Center',
        description: 'Modern conference facility with state-of-the-art technology',
        venueType: 'office',
        location: {
          emirate: 'Dubai',
          city: 'Dubai Marina',
          address: 'Dubai Marina Walk'
        },
        capacity: { minimum: 50, maximum: 300 },
        amenities: ['High-Speed WiFi', 'Projectors', 'Sound System', 'Catering Facilities', 'Parking', 'Reception Area'],
        pricing: {
          basePrice: 500,
          priceType: 'per_hour'
        },
        contact: {
          phone: '+971-4-555-2002',
          email: 'events@marinacc.ae',
          manager: 'Layla Ahmed'
        },
        rating: { average: 4.5, count: 124 }
      },
      {
        name: 'Seaside Resort Venue',
        description: 'Beautiful beachfront venue perfect for outdoor celebrations',
        venueType: 'beach',
        location: {
          emirate: 'Dubai',
          city: 'Jumeirah',
          address: 'Jumeirah Beach Road'
        },
        capacity: { minimum: 80, maximum: 400 },
        amenities: ['Beach Access', 'Outdoor Seating', 'Sunset Views', 'Catering Kitchen', 'Changing Rooms', 'Event Coordination'],
        pricing: {
          basePrice: 12000,
          priceType: 'per_event'
        },
        contact: {
          phone: '+971-4-555-3003',
          email: 'weddings@seasideresort.ae',
          manager: 'Mariam Al-Zahra'
        },
        rating: { average: 4.9, count: 67 }
      }
    ]);

    // Create sample events
    const events = await Event.create([
      {
        title: 'Ahmed & Fatima Wedding',
        description: 'Traditional Emirati wedding celebration',
        organizer: organizers[0]._id,
        eventType: 'wedding',
        date: {
          start: new Date('2025-09-15T17:00:00Z'),
          end: new Date('2025-09-15T23:00:00Z')
        },
        location: {
          emirate: 'Dubai',
          city: 'Downtown Dubai',
          address: 'Grand Ballroom Dubai',
          venue: 'Grand Ballroom Dubai'
        },
        attendees: { expected: 300, confirmed: 280 },
        totalBudget: 45000,
        budgetCategories: [
          { name: 'Venue', allocated: 13500, spent: 8000 },
          { name: 'Catering', allocated: 11250, spent: 0 },
          { name: 'Photography', allocated: 6750, spent: 3500 },
          { name: 'Decoration', allocated: 4500, spent: 0 },
          { name: 'Entertainment', allocated: 4500, spent: 0 },
          { name: 'Other', allocated: 4500, spent: 500 }
        ],
        vendorRequests: [
          {
            vendor: vendors[0]._id, // Catering
            service: 'Wedding Catering',
            status: 'accepted',
            requestedPrice: 11000,
            quotedPrice: 10500,
            finalPrice: 10500,
            notes: 'Premium Arabic cuisine package with live cooking stations'
          },
          {
            vendor: vendors[1]._id, // Photography
            service: 'Wedding Photography',
            status: 'completed',
            requestedPrice: 3500,
            quotedPrice: 3500,
            finalPrice: 3500,
            notes: 'Full day coverage with drone shots'
          }
        ],
        status: 'confirmed'
      },
      {
        title: 'Tech Conference 2025',
        description: 'Annual technology conference for startups and innovators',
        organizer: organizers[1]._id,
        eventType: 'conference',
        date: {
          start: new Date('2025-08-20T09:00:00Z'),
          end: new Date('2025-08-20T17:00:00Z')
        },
        location: {
          emirate: 'Dubai',
          city: 'Dubai Marina',
          address: 'Marina Conference Center',
          venue: 'Marina Conference Center'
        },
        attendees: { expected: 200, confirmed: 150 },
        totalBudget: 25000,
        budgetCategories: [
          { name: 'Venue', allocated: 8750, spent: 4000 },
          { name: 'Catering', allocated: 6250, spent: 0 },
          { name: 'Audio Visual', allocated: 5000, spent: 0 },
          { name: 'Marketing', allocated: 2500, spent: 1200 },
          { name: 'Other', allocated: 2500, spent: 300 }
        ],
        vendorRequests: [
          {
            vendor: vendors[3]._id, // Audio Visual
            service: 'Conference AV Setup',
            status: 'pending',
            requestedPrice: 2200,
            notes: 'Need professional AV setup with live streaming capability'
          }
        ],
        status: 'planning'
      }
    ]);

    console.log('✅ Database seeded successfully!');
    console.log(`👥 Created ${organizers.length} organizers`);
    console.log(`🏪 Created ${vendors.length} vendors`);
    console.log(`🏢 Created ${venues.length} venues`);
    console.log(`🎉 Created ${events.length} events`);
    
    console.log('\n📧 Demo Login Credentials:');
    console.log('Organizers:');
    console.log('- sarah@example.com / password123');
    console.log('- ahmed@example.com / password123');
    console.log('\nVendors:');
    console.log('- fatima@deluxecatering.ae / password123');
    console.log('- mohammed@elegantevents.ae / password123');
    console.log('- aisha@bloomingevents.ae / password123');
    console.log('- khalid@soundwaveav.ae / password123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();