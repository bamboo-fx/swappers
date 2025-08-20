const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, studentId, university, major, year } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        error: 'Email, password, and full name are required' 
      });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          student_id: studentId,
          university,
          major,
          year
        }
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (authData.user && !authData.session) {
      return res.status(201).json({
        message: 'Registration successful. Please check your email for verification.',
        user: {
          id: authData.user.id,
          email: authData.user.email
        }
      });
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        student_id: studentId,
        university,
        major,
        year: year ? parseInt(year) : null
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      session: authData.session
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    res.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile
      },
      session: data.session
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logout successful' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/profile', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ profile });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { fullName, studentId, university, major, year } = req.body;

    const updateData = {};
    if (fullName !== undefined) updateData.full_name = fullName;
    if (studentId !== undefined) updateData.student_id = studentId;
    if (university !== undefined) updateData.university = university;
    if (major !== undefined) updateData.major = major;
    if (year !== undefined) updateData.year = year ? parseInt(year) : null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: 'Profile updated successfully',
      profile
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      message: 'Token refreshed successfully',
      session: data.session
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;