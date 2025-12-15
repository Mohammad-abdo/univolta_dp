import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import env from "../../config/env.js";
import prisma from "../../config/prisma.js";
import { parseDurationToMilliseconds } from "../../common/utils/time.js";
import { User } from "@prisma/client";

type TokenContext = {
  ip?: string | null;
  userAgent?: string | null;
};

export async function createAuthTokens(user: User, context: TokenContext) {
  const accessToken = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES,
    }
  );

  const refreshTokenRaw = crypto.randomBytes(48).toString("hex");
  const refreshExpiresAt = new Date(
    Date.now() + parseDurationToMilliseconds(env.JWT_REFRESH_EXPIRES)
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: await bcrypt.hash(refreshTokenRaw, 10),
      userAgent: context.userAgent ?? null,
      ip: context.ip ?? null,
      expiresAt: refreshExpiresAt,
    },
  });

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      token: refreshTokenRaw,
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES,
    }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: parseDurationToMilliseconds(env.JWT_ACCESS_EXPIRES) / 1000,
  };
}

export async function revokeUserRefreshTokens(userId: string, userAgent?: string | null) {
  await prisma.refreshToken.deleteMany({
    where: {
      userId,
      ...(userAgent ? { userAgent } : {}),
    },
  });
}


