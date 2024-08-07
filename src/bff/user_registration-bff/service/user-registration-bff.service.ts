import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordUserDto } from '../dto/password-user-registration.dto';
import { UpdateUserRegistrationDto } from '../dto/update-user-registration.dto';

@Injectable()
export class UserRegistrationBffService {
  constructor(private readonly prismaService: PrismaService) { }

  async encryptedPassword(password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return hashedPassword;
  }


  async updateUser(CreateUserDto: UpdateUserRegistrationDto, id: string) {
    const userRegistered = await this.prismaService.users.findMany({
      where: { email: CreateUserDto.email },
    });

    const userR = await this.prismaService.users.findUnique({
      where: { id: +id },
    });



    if (userRegistered.length > 0 && CreateUserDto.email !== userR.email) {
      throw new HttpException('email already exists', HttpStatus.BAD_REQUEST);
    }

    try {
      const transactionResult = this.prismaService.$transaction(async (tx) => {
        const user = await tx.users.update({
          where: { id: +id },
          data: {
            name: CreateUserDto.name,
            email: CreateUserDto.email,
          },
        });

        const register = await tx.registration.findFirst({
          where: {
            user_fk: +id
          }
        })

        if (register) {
          await tx.registration.update({
            where: { id: register.id },
            data: {
              birthday: CreateUserDto.birthday,
              color_race: CreateUserDto.color_race,
              sex: CreateUserDto.sex,
              zone: CreateUserDto.zone,
              deficiency: CreateUserDto.deficiency,
              cpf: CreateUserDto.cpf,
              responsable_telephone: CreateUserDto.responsable_telephone,
              responsable_name: CreateUserDto.responsable_name,
              responsable_cpf: CreateUserDto.responsable_cpf,
              kinship: CreateUserDto.kinship
            }
          })
        } else {
          await tx.registration.create({
            data: {
              birthday: CreateUserDto.birthday,
              color_race: CreateUserDto.color_race,
              sex: CreateUserDto.sex,
              zone: CreateUserDto.zone,
              deficiency: CreateUserDto.deficiency,
              cpf: CreateUserDto.cpf,
              responsable_telephone: CreateUserDto.responsable_telephone,
              responsable_name: CreateUserDto.responsable_name,
              responsable_cpf: CreateUserDto.responsable_cpf,
              kinship: CreateUserDto.kinship,
              user: { connect: { id: +id } }
            }
          })
        }

        return { message: 'Perfil atualizado com sucesso!' };
      });
      return transactionResult;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async changePassword(
    id: number,
    newPassword: ChangePasswordUserDto,
    req: any,
  ) {
    const userReq = await this.prismaService.users.findUnique({
      where: { id: +req },
    });

    if (userReq.role !== 'ADMIN') {
      throw new HttpException(
        'Usuário não tem permissão',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prismaService.users.findUnique({
      where: { id: +id },
    });

    if (!user) {
      throw new HttpException('email already exists', HttpStatus.BAD_REQUEST);
    }
    try {
      const password = await this.encryptedPassword(newPassword.password);
      await this.prismaService.users.update({
        where: { id: id },
        data: {
          password: password,
        },
      });
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(id: number) {
    const user = await this.prismaService.users.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        password: false,
        role: true,
        registration: {
          where: { user_fk: id }
        },
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }
}
