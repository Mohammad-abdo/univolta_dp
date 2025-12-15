import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};


