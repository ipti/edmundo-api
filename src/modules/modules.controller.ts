import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModulesResponse } from './doc/modules.response';
import { CreateModulesDto } from './dto/create-modules.dto';
import { UpdateModulesDto } from './dto/update-modules.dto';
import { ModulesService } from './shared/modules.service';
import { ReorderModulesDto } from './dto/reorder-modules.dto';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('modules')
@ApiTags('Modules')
export class ModulesController {
  constructor(private ModulesService: ModulesService) {}

  @Post()
  @ApiCreatedResponse({ type: ModulesResponse })
  async create(@Req() req: Request, @Body() project: CreateModulesDto) {
    return this.ModulesService.create(req.user, project);
  }

  @Get()
  async getAll() {
    return this.ModulesService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: ModulesResponse })
  async getById(@Param('id') id: string) {
    return this.ModulesService.findOne(id);
  }

  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() project: UpdateModulesDto,
  ) {
    return this.ModulesService.update(req.user, id, project);
  }

  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    return this.ModulesService.remove(req.user, id);
  }

  @Patch('reorder')
  async reorder(@Req() req: Request, @Body() body: ReorderModulesDto) {
    return this.ModulesService.reorder(req.user, body.newOrder);
  }
}
