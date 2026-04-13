import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { isEmpty } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../dto/create-user.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    const userRegistered = await this.prisma.users.findMany({
      where: { email: createUserDto.email },
    });

    if (userRegistered.length > 0) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }
    const hashedPassword = await this.hashPassword(createUserDto.password);

    try {
      const createdUser = await this.prisma.users.create({
        data: { ...createUserDto, password: hashedPassword,
         },
      });

      return createdUser;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query: QueryUserDto) {
    const selectInfo = {
      id: true,
      name: true,
      email: true,
      active: true,
      password: false,
    };
    const filters = isEmpty(query) ? {} : { ...query };

    return this.prisma.users.findMany({
      select: { ...selectInfo, role: true },
      where: filters,
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        active: true,
        password: false,
        role: true,
        email: true
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto, email: string) {
    try {
      const user = await this.findOne(id);
      const updatedUser = await this.prisma.users.update({
        where: {
          id,
        },
        data: { ...user, active: updateUserDto.active },
      });

      return updatedUser;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findOneByEmail(email: string) {
    const user = await this.prisma.users.findFirst({
      where: { email: email },
    });


    return user;
  }

  async remove(id: string) {
    try {
      const user = await this.findOne(+id);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const registration = await this.prisma.registration.findMany({
        where: { user_fk: user.id },
      })



      if (registration.length > 0) {

        for (const i of registration) {

          await this.prisma.registration.delete({
            where: { id: i.id },
          })
        }
      }

      const user_classroom = await this.prisma.user_classroom.findMany({
        where: { usersId: user.id },
      })


      if (user_classroom.length > 0) {

        for (const i of user_classroom) {

          await this.prisma.user_classroom.delete({
            where: { id: i.id },
          })
        }
      }


      const user_reapplication = await this.prisma.user_reapplication.findMany({
        where: { user_fk: user.id },
      })


      if (user_reapplication.length > 0) {

        for (const i of user_reapplication) {

          await this.prisma.user_reapplication.delete({
            where: { id: i.id },
          })
        }
      }

      await this.prisma.users.delete({
        where: { id: user.id },
      });

      return { message: 'User deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async resetPassword(id: number, newPassword: string) {
    try {
      const user = await this.findOne(id);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const hashedPassword = await this.hashPassword(newPassword);

      await this.prisma.users.update({
        where: { id },
        data: { password: hashedPassword },
      });

      return { message: 'Senha alterada com sucesso' };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
