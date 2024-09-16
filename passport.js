const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const User = require('./models/userModel'); // Replace with your user model

passport.serializeUser((user, done) => {
  done(null, user.id); // Serialize user to store in session
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); // Deserialize user from session
  } catch (err) {
    done(err);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3002/auth/google/callback',
  passReqToCallback: true
},
  async (request, accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists in your database based on email
      let user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        return done(null, user); // User exists, return user
      } else {
        return done(null, false, { message: 'No user with that email found.' });
      }
    } catch (err) {
      return done(err);
    }
  }
));
