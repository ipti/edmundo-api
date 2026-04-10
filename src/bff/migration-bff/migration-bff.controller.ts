import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TagResponse } from './doc/migration-bff.response';
import {
  MigrationDto,
  MigrationMeubenToCodedDto,
  SyncClassroomDto,
} from './dto/migration-bff.dto';
import { MigrationBffService } from './shared/migration-bff.service';
import { Request } from 'express';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('migration-bff')
@ApiTags('MigrationBff')
export class MigrationBffController {
  constructor(private MigrationBffService: MigrationBffService) { }

  @Post('')
  @ApiCreatedResponse({ type: TagResponse })
  async createTagUser(@Body() MigrationDto: MigrationDto) {
    return this.MigrationBffService.migrationMeuBen(MigrationDto);
  }

  @Post('meubentocoded')
  @ApiCreatedResponse({ type: TagResponse })
  async createMeuBenToCoded(
    @Body() MigrationDto: MigrationMeubenToCodedDto,
    @Req() req: Request,
  ) {
    return this.MigrationBffService.migrationMeuBentocoded(
      MigrationDto,
      req.user,
    );
  }

  @Post('meubentocoded/sync')
  @ApiCreatedResponse({ type: TagResponse })
  async syncMeuBenToCoded(
    @Body() MigrationDto: MigrationMeubenToCodedDto,
    @Req() req: Request,
  ) {
    return this.MigrationBffService.migrationMeuBentocoded(MigrationDto, req.user);
  }

  @Get('')
  async getAll() {
    return this.MigrationBffService.findTsAll();
  }

  @Get('classroom-list')
  async getClassroomList(@Query('idProject') idProject: string) {
    return this.MigrationBffService.findClassroomList(idProject);
  }
}
