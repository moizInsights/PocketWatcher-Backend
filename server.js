const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 6000;
const JWT_SECRET = process.env.JWT_SECRET || 'pocketwatcher_secret_key';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://PocketWatcher:pocketwatcher@cluster0.bpq9riq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// SCHEMAS
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
  // Vendor specific fields
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
  // Organizer specific fields
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
  notes: [{
    content: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  content: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'quote', 'image', 'document'], default: 'text' },
  quotation: {
    services: [String],
    totalPrice: Number,
    breakdown: [{
      item: String,
      price: Number
    }],
    validUntil: Date,
    terms: String
  },
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  isRead: { type: Boolean, default: false },
  readAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  photos: [String],
  response: {
    content: String,
    respondedAt: Date
  },
  createdAt: { type: Date, default: Date.now }
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
  images: [{
    url: String,
    caption: String
  }],
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

// Models
const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const Message = mongoose.model('Message', messageSchema);
const Review = mongoose.model('Review', reviewSchema);
const Venue = mongoose.model('Venue', venueSchema);

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// AUTHENTICATION ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, userType, location, businessName, services, category, organizationType } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userData = {
      name,
      email,
      password: hashedPassword,
      userType,
      location
    };

    if (userType === 'vendor') {
      userData.businessName = businessName;
      userData.services = services;
      userData.category = category;
    } else if (userType === 'organizer') {
      userData.organizationType = organizationType;
    }

    const user = new User(userData);
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        location: user.location
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// USER PROFILE ROUTES
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password updates here
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).select('-password');
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// VENDOR DISCOVERY ROUTES
app.get('/api/vendors', async (req, res) => {
  try {
    const { category, emirate, priceMin, priceMax, search } = req.query;
    
    let query = { userType: 'vendor', isActive: true };
    
    if (category) query.category = category;
    if (emirate) query['location.emirate'] = emirate;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { services: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const vendors = await User.find(query)
      .select('-password')
      .sort({ 'rating.average': -1, createdAt: -1 });
    
    res.json({ success: true, vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.get('/api/vendors/:id', async (req, res) => {
  try {
    const vendor = await User.findOne({ 
      _id: req.params.id, 
      userType: 'vendor' 
    }).select('-password');
    
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    
    res.json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// EVENT ROUTES
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'organizer') {
      return res.status(403).json({ success: false, message: 'Only organizers can create events' });
    }

    const eventData = {
      ...req.body,
      organizer: req.user.userId
    };

    const event = new Event(eventData);
    await event.save();

    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.userType === 'organizer') {
      query.organizer = req.user.userId;
    } else {
      // For vendors, show events where they have pending requests or are hired
      query['vendorRequests.vendor'] = req.user.userId;
    }

    const events = await Event.find(query)
      .populate('organizer', 'name email location')
      .populate('vendorRequests.vendor', 'name businessName category rating')
      .sort({ createdAt: -1 });

    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.get('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email location')
      .populate('vendorRequests.vendor', 'name businessName category rating profile');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if user has access to this event
    const hasAccess = event.organizer._id.toString() === req.user.userId || 
                     event.vendorRequests.some(vr => vr.vendor._id.toString() === req.user.userId);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.put('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('organizer', 'name email').populate('vendorRequests.vendor', 'name businessName');

    res.json({ success: true, event: updatedEvent });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// VENDOR REQUEST ROUTES
app.post('/api/events/:eventId/vendor-requests', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'organizer') {
      return res.status(403).json({ success: false, message: 'Only organizers can send vendor requests' });
    }

    const { vendorId, service, requestedPrice, notes } = req.body;
    
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if request already exists
    const existingRequest = event.vendorRequests.find(
      vr => vr.vendor.toString() === vendorId && vr.service === service
    );

    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'Request already exists for this vendor and service' });
    }

    event.vendorRequests.push({
      vendor: vendorId,
      service,
      requestedPrice,
      notes
    });

    await event.save();

    res.json({ success: true, message: 'Vendor request sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.put('/api/events/:eventId/vendor-requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { status, quotedPrice, notes } = req.body;
    
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const vendorRequest = event.vendorRequests.id(req.params.requestId);
    if (!vendorRequest) {
      return res.status(404).json({ success: false, message: 'Vendor request not found' });
    }

    // Check permissions
    if (req.user.userType === 'vendor' && vendorRequest.vendor.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if (req.user.userType === 'organizer' && event.organizer.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update request
    if (status) vendorRequest.status = status;
    if (quotedPrice) vendorRequest.quotedPrice = quotedPrice;
    if (notes) vendorRequest.notes = notes;

    await event.save();

    res.json({ success: true, message: 'Vendor request updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// MESSAGING ROUTES
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { recipientId, eventId, content, messageType, quotation, attachments } = req.body;

    const messageData = {
      sender: req.user.userId,
      recipient: recipientId,
      content,
      messageType: messageType || 'text'
    };

    if (eventId) messageData.event = eventId;
    if (quotation) messageData.quotation = quotation;
    if (attachments) messageData.attachments = attachments;

    const message = new Message(messageData);
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name userType businessName')
      .populate('recipient', 'name userType businessName')
      .populate('event', 'title');

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { eventId, recipientId } = req.query;
    
    let query = {
      $or: [
        { sender: req.user.userId },
        { recipient: req.user.userId }
      ]
    };

    if (eventId) query.event = eventId;
    if (recipientId) {
      query.$and = [
        {
          $or: [
            { sender: req.user.userId, recipient: recipientId },
            { sender: recipientId, recipient: req.user.userId }
          ]
        }
      ];
    }

    const messages = await Message.find(query)
      .populate('sender', 'name userType businessName')
      .populate('recipient', 'name userType businessName')
      .populate('event', 'title')
      .sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(req.user.userId) },
            { recipient: new mongoose.Types.ObjectId(req.user.userId) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$sender', new mongoose.Types.ObjectId(req.user.userId)] },
              then: '$recipient',
              else: '$sender'
            }
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ['$recipient', new mongoose.Types.ObjectId(req.user.userId)] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'participant'
        }
      },
      {
        $unwind: '$participant'
      },
      {
        $project: {
          participant: {
            _id: 1,
            name: 1,
            userType: 1,
            businessName: 1,
            'profile.avatar': 1
          },
          lastMessage: 1,
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// VENUE ROUTES
app.get('/api/venues', async (req, res) => {
  try {
    const { emirate, venueType, minCapacity, maxCapacity, priceMin, priceMax } = req.query;
    
    let query = { isActive: true };
    
    if (emirate) query['location.emirate'] = emirate;
    if (venueType) query.venueType = venueType;
    if (minCapacity) query['capacity.maximum'] = { $gte: parseInt(minCapacity) };
    if (maxCapacity) query['capacity.minimum'] = { $lte: parseInt(maxCapacity) };
    if (priceMin || priceMax) {
      query['pricing.basePrice'] = {};
      if (priceMin) query['pricing.basePrice'].$gte = parseInt(priceMin);
      if (priceMax) query['pricing.basePrice'].$lte = parseInt(priceMax);
    }

    const venues = await Venue.find(query).sort({ 'rating.average': -1 });
    
    res.json({ success: true, venues });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// REVIEW ROUTES
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { revieweeId, eventId, rating, comment, photos } = req.body;

    // Check if review already exists
    const existingReview = await Review.findOne({
      reviewer: req.user.userId,
      reviewee: revieweeId,
      event: eventId
    });

    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Review already exists' });
    }

    const review = new Review({
      reviewer: req.user.userId,
      reviewee: revieweeId,
      event: eventId,
      rating,
      comment,
      photos
    });

    await review.save();

    // Update reviewee's rating
    const reviews = await Review.find({ reviewee: revieweeId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await User.findByIdAndUpdate(revieweeId, {
      'rating.average': avgRating,
      'rating.count': reviews.length
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

app.get('/api/reviews/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name userType')
      .populate('event', 'title')
      .sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// FILE UPLOAD ROUTE
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    res.json({
      success: true,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      originalName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

// BUDGET RECOMMENDATIONS ROUTE
app.get('/api/budget-recommendations/:eventType', authenticateToken, async (req, res) => {
  try {
    const { eventType } = req.params;
    const { attendees, totalBudget } = req.query;

    // Sample budget breakdown recommendations based on event type
    const budgetRecommendations = {
      wedding: {
        venue: 30,
        catering: 25,
        photography: 15,
        decoration: 10,
        entertainment: 10,
        flowers: 5,
        other: 5
      },
      corporate: {
        venue: 35,
        catering: 30,
        audio_visual: 15,
        decoration: 10,
        transportation: 5,
        other: 5
      },
      birthday: {
        venue: 25,
        catering: 30,
        decoration: 20,
        entertainment: 15,
        photography: 5,
        other: 5
      },
      conference: {
        venue: 40,
        catering: 25,
        audio_visual: 20,
        decoration: 10,
        transportation: 3,
        other: 2
      },
      default: {
        venue: 30,
        catering: 25,
        decoration: 15,
        entertainment: 10,
        photography: 10,
        other: 10
      }
    };

    const breakdown = budgetRecommendations[eventType] || budgetRecommendations.default;
    const budget = parseFloat(totalBudget);
    
    const recommendations = Object.entries(breakdown).map(([category, percentage]) => ({
      category: category.replace('_', ' ').toUpperCase(),
      percentage,
      amount: Math.round((budget * percentage) / 100),
      description: getCategoryDescription(category)
    }));

    // Add cost-saving tips based on event type and budget
    const costSavingTips = getCostSavingTips(eventType, attendees, budget);

    res.json({
      success: true,
      recommendations,
      costSavingTips,
      totalBudget: budget,
      currency: 'AED'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Helper function for category descriptions
function getCategoryDescription(category) {
  const descriptions = {
    venue: 'Location rental, setup fees, and basic facilities',
    catering: 'Food, beverages, service staff, and equipment',
    photography: 'Professional photographer, videographer, and editing',
    decoration: 'Flowers, lighting, centerpieces, and themed decorations',
    entertainment: 'DJ, live music, performers, or entertainment systems',
    audio_visual: 'Sound systems, microphones, projectors, and lighting',
    transportation: 'Guest transportation, parking, and logistics',
    flowers: 'Bouquets, arrangements, and floral decorations',
    security: 'Event security personnel and crowd management',
    other: 'Miscellaneous expenses and contingency fund'
  };
  return descriptions[category] || 'Additional event-related expenses';
}

// Helper function for cost-saving tips
function getCostSavingTips(eventType, attendees, budget) {
  const tips = [
    'Book venues during off-peak days (Sunday-Thursday) for better rates',
    'Consider buffet-style catering instead of plated meals to reduce costs',
    'Use local vendors to save on transportation and logistics',
    'Book vendors 2-3 months in advance for early bird discounts',
    'Mix fresh flowers with artificial ones for decoration savings'
  ];

  const budgetPerPerson = budget / attendees;
  
  if (budgetPerPerson < 100) {
    tips.push(
      'Consider home venues or community halls for significant savings',
      'Ask friends/family to help with photography and videography',
      'Use DIY decorations and centerpieces'
    );
  }

  if (eventType === 'wedding') {
    tips.push(
      'Consider weekday weddings for 20-30% venue discounts',
      'Limit guest list to close family and friends',
      'Use seasonal flowers and local suppliers'
    );
  }

  if (eventType === 'corporate') {
    tips.push(
      'Partner with other companies for shared event costs',
      'Use company facilities or partner venues',
      'Focus budget on networking opportunities and quality catering'
    );
  }

  return tips.slice(0, 5); // Return top 5 tips
}

// ANALYTICS ROUTES
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    let analytics = {};

    if (req.user.userType === 'organizer') {
      // Organizer analytics
      const events = await Event.find({ organizer: req.user.userId });
      const totalEvents = events.length;
      const completedEvents = events.filter(e => e.status === 'completed').length;
      const totalBudget = events.reduce((sum, e) => sum + e.totalBudget, 0);
      const totalSpent = events.reduce((sum, e) => 
        sum + e.budgetCategories.reduce((catSum, cat) => catSum + cat.spent, 0), 0
      );

      analytics = {
        totalEvents,
        completedEvents,
        upcomingEvents: events.filter(e => new Date(e.date.start) > new Date()).length,
        totalBudget,
        totalSpent,
        savings: totalBudget - totalSpent,
        averageEventBudget: totalEvents > 0 ? totalBudget / totalEvents : 0,
        eventsByStatus: {
          planning: events.filter(e => e.status === 'planning').length,
          confirmed: events.filter(e => e.status === 'confirmed').length,
          completed: events.filter(e => e.status === 'completed').length,
          cancelled: events.filter(e => e.status === 'cancelled').length
        }
      };
    } else {
      // Vendor analytics
      const allEvents = await Event.find({
        'vendorRequests.vendor': req.user.userId
      });

      const acceptedRequests = allEvents.reduce((count, event) => {
        return count + event.vendorRequests.filter(vr => 
          vr.vendor.toString() === req.user.userId && vr.status === 'accepted'
        ).length;
      }, 0);

      const completedJobs = allEvents.reduce((count, event) => {
        return count + event.vendorRequests.filter(vr => 
          vr.vendor.toString() === req.user.userId && vr.status === 'completed'
        ).length;
      }, 0);

      const totalEarnings = allEvents.reduce((sum, event) => {
        return sum + event.vendorRequests
          .filter(vr => vr.vendor.toString() === req.user.userId && vr.finalPrice)
          .reduce((reqSum, vr) => reqSum + (vr.finalPrice || 0), 0);
      }, 0);

      const reviews = await Review.find({ reviewee: req.user.userId });
      const avgRating = reviews.length > 0 ? 
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

      analytics = {
        totalRequests: allEvents.reduce((count, event) => {
          return count + event.vendorRequests.filter(vr => 
            vr.vendor.toString() === req.user.userId
          ).length;
        }, 0),
        acceptedRequests,
        completedJobs,
        totalEarnings,
        averageRating: avgRating,
        totalReviews: reviews.length,
        responseRate: acceptedRequests > 0 ? (acceptedRequests / allEvents.length * 100) : 0
      };
    }

    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// SEARCH ROUTES
app.get('/api/search', async (req, res) => {
  try {
    const { q, type, emirate } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query required' });
    }

    let results = {};

    // Search vendors
    if (!type || type === 'vendors') {
      let vendorQuery = {
        userType: 'vendor',
        isActive: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { businessName: { $regex: q, $options: 'i' } },
          { services: { $in: [new RegExp(q, 'i')] } },
          { category: { $regex: q, $options: 'i' } }
        ]
      };

      if (emirate) vendorQuery['location.emirate'] = emirate;

      results.vendors = await User.find(vendorQuery)
        .select('-password')
        .limit(10)
        .sort({ 'rating.average': -1 });
    }

    // Search venues
    if (!type || type === 'venues') {
      let venueQuery = {
        isActive: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { venueType: { $regex: q, $options: 'i' } }
        ]
      };

      if (emirate) venueQuery['location.emirate'] = emirate;

      results.venues = await Venue.find(venueQuery)
        .limit(10)
        .sort({ 'rating.average': -1 });
    }

    // Search events (for organizers only)
    if (type === 'events' && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.userType === 'organizer') {
          results.events = await Event.find({
            organizer: decoded.userId,
            $or: [
              { title: { $regex: q, $options: 'i' } },
              { description: { $regex: q, $options: 'i' } },
              { eventType: { $regex: q, $options: 'i' } }
            ]
          }).limit(10);
        }
      } catch (err) {
        // Token verification failed, skip events search
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// NOTIFICATION ROUTES
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = [];

    if (req.user.userType === 'organizer') {
      // Check for new vendor responses
      const events = await Event.find({ organizer: req.user.userId })
        .populate('vendorRequests.vendor', 'name businessName');

      events.forEach(event => {
        event.vendorRequests.forEach(vr => {
          if (vr.status === 'accepted' && vr.quotedPrice) {
            notifications.push({
              type: 'vendor_response',
              message: `${vr.vendor.businessName} responded to your request for ${event.title}`,
              eventId: event._id,
              vendorId: vr.vendor._id,
              createdAt: vr.requestedAt
            });
          }
        });
      });
    } else {
      // Check for new vendor requests
      const events = await Event.find({ 'vendorRequests.vendor': req.user.userId })
        .populate('organizer', 'name');

      events.forEach(event => {
        const userRequests = event.vendorRequests.filter(vr => 
          vr.vendor.toString() === req.user.userId && vr.status === 'pending'
        );

        userRequests.forEach(vr => {
          notifications.push({
            type: 'new_request',
            message: `New event request from ${event.organizer.name} for ${event.title}`,
            eventId: event._id,
            organizerId: event.organizer._id,
            createdAt: vr.requestedAt
          });
        });
      });
    }

    // Sort by most recent
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, notifications: notifications.slice(0, 20) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'PocketWatcher API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ERROR HANDLING
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 HANDLER
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 PocketWatcher Server running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`💾 MongoDB connection: ${MONGODB_URI}`);
});

module.exports = app;