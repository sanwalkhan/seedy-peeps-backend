import { Injectable } from '@nestjs/common';
import { GoogleSignInUserDto } from 'src/modules/google-auth/google-sign-in.dto';
import { IUser } from 'src/modules/user/user.interface';
import { getGoogleUser, revokeGoogleToken } from './helpers';
import { UserService } from 'src/modules/user/user.service';
import { LogoutDto } from './logout.dto';

@Injectable()
export class GoogleAuthService {
  constructor(private userService: UserService) {}

  async checkGoogleAccount(googleSignInUserDto: GoogleSignInUserDto): Promise<{
    newUser: IUser;
    userExists?: boolean;
  }> {
    const { token } = googleSignInUserDto;
    console.log('token', token);
    const googleUser = await getGoogleUser(token);
    console.log('googleUser', googleUser);
    const userExists = await this.userService.getUserByEmail(googleUser.email);
    console.log('userExists', userExists);
    return { newUser: googleUser, userExists: !!userExists };
  }

  async logoutGoogleAccount(logoutDto: LogoutDto): Promise<void> {
    const { token } = logoutDto;
    await revokeGoogleToken(token);
  }
}
