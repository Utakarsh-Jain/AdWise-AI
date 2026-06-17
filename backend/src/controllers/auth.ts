import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'adwise_super_secret_token_123_change_me';

/**
 * Handle user signup
 */
export async function signup(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      message: 'Signup successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('Signup Error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
}

/**
 * Handle user login
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // If user signed up via Google and has no password
    if (!user.password) {
      return res.status(401).json({ error: 'This account uses Google Sign-In. Please use the Google button to log in.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
}

/**
 * Handle Google Sign-In / Sign-Up
 * Receives the Google ID token (credential) from the frontend,
 * verifies it with Google's tokeninfo API, and upserts the user.
 */
export async function googleAuth(req: Request, res: Response) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential token is required.' });
    }

    // Verify the Google ID token using Google's tokeninfo endpoint
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);

    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Invalid Google credential. Please try again.' });
    }

    const payload = await googleRes.json() as { email?: string; name?: string; sub?: string };
    const { email, name, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Could not retrieve email from Google account.' });
    }

    // Upsert: find existing user by email, or create a new one
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || email.split('@')[0],
          email,
          password: null, // Google-only user, no password
        },
      });
    }

    // Generate local JWT token
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      message: 'Google authentication successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    return res.status(500).json({ error: 'Server error during Google authentication.' });
  }
}

