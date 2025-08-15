import {
  Controller,
  Post,
  Body,
  UsePipes,
  UseGuards,
  Req,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { UserService } from './domain/services/user.service';
import {
  emailSchema,
  EmailDto,
  ResetPasswordDto,
  resetPasswordSchema,
} from './domain/validators/user.validator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { JwtPayload } from '@/modules/auth/domain/strategies/jwt-access.strategy';
import { JwtAccessGuard } from '@/modules/auth/application/guards/jwt-access.guard';

// 클라언트에서 Access Token과 함께 요청하면 UseGuards 데코레이터가 알아서 서명과 만료 기간을 확인
// 토큰이 유효하지 않으면 JwtAccessGuard가 401 Unauthorized 오류를 반환

// Authorization: Bearer <만료되었을-수도-있는-Access-Token>
// X-Refresh-Token: <유효한-Refresh-Token>

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAccessGuard)
  async getProfile(@Req() req: { user: JwtPayload }) {
    return await this.userService.getUserProfile(req.user.userId);
  }

  @Post('send-reset-email')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(emailSchema))
  async sendResetEmail(@Body() emailDto: EmailDto) {
    await this.userService.sendPasswordResetEmail(emailDto);
    return { message: 'Password reset email sent successfully.' };
  }

  @Patch('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.userService.resetPassword(resetPasswordDto);
    return { message: 'Password has been reset successfully.' };
  }
}
