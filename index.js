// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static('public'));

// Parse JSON and URL-encoded form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Schemas and Models
const { Schema } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const user = new User({ username });
    const savedUser = await user.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// Add exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { description, duration, date } = req.body;
    const exerciseDate = date ? new Date(date) : new Date();

    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: exerciseDate.toDateString()
    });

    const savedExercise = await newExercise.save();

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date,
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

// Get exercise logs for a user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { from, to, limit } = req.query;
    let filter = { userId: user._id };

    // Apply optional date filters
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from).toDateString();
      if (to) filter.date.$lte = new Date(to).toDateString();
    }

    let query = Exercise.find(filter);
    if (limit) query = query.limit(parseInt(limit));

    const exercises = await query.exec();

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Server is listening on port ' + listener.address().port);
});
