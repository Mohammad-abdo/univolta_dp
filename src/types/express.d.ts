import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
      universityId?: string | null;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};


