import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserResponse } from './doc/users-registration.response';
import { UpdateUserRegistrationDto } from './dto/update-user-registration.dto';
import { UserRegistrationBffService } from './service/user-registration-bff.service';
import { CreateUserRegistrationDto } from './dto/create-users-registration.dto';
import { ChangePasswordUserDto } from './dto/password-user-registration.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';


@ApiTags('User-Registration-bff')
@Controller('user-registration-bff')
export class UserRegistrationBffController {
  constructor(private UserService: UserRegistrationBffService) { }

  @Post()
  @ApiCreatedResponse({ type: UserResponse })
  async create(@Body() user: CreateUserRegistrationDto) {
    return this.UserService.create(user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Put()
  @ApiCreatedResponse({ type: UserResponse })
  async updateUser(
    @Body() user: UpdateUserRegistrationDto,
    @Query('idUser') idUser: string,
  ) {
    return this.UserService.updateUser(user, idUser);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Put('avatar/:id')
  async updateavatar(@Param('id') id: string, @UploadedFile('file') file: any) {
    return this.UserService.updateAvatar(id, file);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Put('reset-password/:id')
  async resetPassword(
    @Param('id') id: number,
    @Body() body: ChangePasswordUserDto,
    @Req() req: Request,
  ) {
    const currentUser = req.user as any;
    return this.UserService.changePassword(+id, body, currentUser?.id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('add-reapplication')
  async addReapplication(
    @Query('idUser') idUser: number,
    @Query('idReapplication') idReapplication: number,
    @Req() req: Request,
  ) {
    const currentUser = req.user as any;
    return this.UserService.addUserReapplication(+idUser, +idReapplication, currentUser?.id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Delete('remove-reapplication')
  async removeReapplication(
    @Query('idUser') idUser: number,
    @Query('idReapplication') idReapplication: number,
    @Req() req: Request,
  ) {
    const currentUser = req.user as any;
    return this.UserService.removeUserReapplication(+idUser, +idReapplication, currentUser?.id);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiCreatedResponse({ type: UserResponse })
  async getById(@Param('id') id: string) {
    return this.UserService.findOne(+id);
  }
}
