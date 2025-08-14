import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// This interface defines the shape of the data encoded in our JWT
interface UserPayload {
  userId: number;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

// We are extending the default Express Request type to include our custom 'user' property
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 1. Look for the token in the 'Authorization' header
  const authHeader = req.headers.authorization;

  // 2. If the header is missing or doesn't start with "Bearer ", block the request
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token is required' });
  }

  // 3. Extract the token from the "Bearer <token>" string
  const token = authHeader.split(' ')[1];

  try {
    // 4. Verify the token using our secret key
    const decodedPayload = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;

    // 5. If successful, attach the user's data to the request object
    req.user = decodedPayload;

    // 6. Pass control to the next function in the chain (our actual API logic)
    next();
  } catch (error) {
    // If verification fails, block the request
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};