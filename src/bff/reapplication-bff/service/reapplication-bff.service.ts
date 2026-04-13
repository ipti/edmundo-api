import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtPayload } from 'src/utils/jwt.interface';

@Injectable()
export class ReapplicationnBffService {
  constructor(private readonly prismaService: PrismaService) { }





  async findReapplicationUser(user: JwtPayload) {
    try {
      const isAdmin = await this.prismaService.users.findMany({
        where: { id: user.id },
      });

      const whereCondition =
        isAdmin[0].role === 'ADMIN'
          ? {}
          :
          {
            user_reapplication: {
              some: { user_fk: user.id },
            },
          };

      const reaplication = await this.prismaService.reapplication.findMany({
        where: whereCondition,
        include: {
          _count: {
            select: {
              classrooms: true
            }
          }
        }
      });

      if (!reaplication) {
        throw new HttpException(
          'Reapplication not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return reaplication;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

}