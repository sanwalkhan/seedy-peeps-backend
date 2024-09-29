import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { GoogleSignInUserDto } from 'src/modules/google-auth/google-sign-in.dto';
import { LogoutDto } from './logout.dto';

@Controller('google-auth')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Post('/sign-in')
  async signInGoogleUser(
    @Res() response,
    @Body() googleSignInUserDto: GoogleSignInUserDto,
  ) {
    try {
      const user =
        await this.googleAuthService.checkGoogleAccount(googleSignInUserDto);
      return response.status(HttpStatus.OK).json({
        statusCode: 200,
        user: user.newUser,
        userExists: user.userExists,
      });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        error: error?.response?.statusText,
        message: 'User not found!',
      });
    }
  }

  @Post('/logout')
  async logoutGoogleUser(@Res() response, @Body() logoutDto: LogoutDto) {
    try {
      await this.googleAuthService.logoutGoogleAccount(logoutDto);
      return response.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Successfully logged out',
      });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        error: error?.response?.statusText,
        message: 'Failed to log out',
      });
    }
  }
}
