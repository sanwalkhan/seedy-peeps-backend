import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class VerifyAuthentication implements NestMiddleware {
  constructor(private readonly userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const headers = req.headers;
    // header is 'x-auth-access' - Frontend would send token in this header
    const accessToken = headers['x-auth-access'];

    const resp = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // If resp is successful and we get user information then we will proceed to next check
    // Get email from user information and check whether user with this email exists or not

    const user = await resp.json();
    const userEmail = user.email;

    const existingUser = await this.userService.getUserByEmail(userEmail);
    if (!existingUser) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    req.user = existingUser;
    next();
  }
}
