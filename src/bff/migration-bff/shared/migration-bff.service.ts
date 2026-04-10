import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Kinship } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  MigrationDto,
  MigrationMeubenToCodedDto,
} from '../dto/migration-bff.dto';
import { JwtPayload } from 'src/utils/jwt.interface';
import { UsersService } from 'src/users/shared/users.service';

export interface RegistrationDto {
  name: string;
  birthday: string;
  cpf?: string;
  sex?: number;
  color_race?: number;
  deficiency: boolean;
  zone?: number;
  deficiency_description?: string;
  responsable_name?: string;
  responsable_cpf?: string;
  responsable_telephone?: string;
  kinship?: Kinship;
}

@Injectable()
export class MigrationBffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userServices: UsersService,
  ) { }

  async migrationMeuBen(MigrationDto: MigrationDto) {
    try {
      const transactionResult = this.prisma.$transaction(async (tx) => {
        const registration = await tx.user_classroom.findMany({
          where: {
            classroomId: MigrationDto.idClassroom,
            users: {
              role: 'STUDENT',
            },
          },
          select: {
            users: {
              select: {
                name: true,
                registration: true,
              },
            },
          },
        });

        const body: any = registration.map((item) => {
          const registrationOne = item.users.registration[0];
          return {
            name: item.users.name,
            cpf: registrationOne.cpf,
            birthday: registrationOne.birthday.toISOString().split('T')[0],
            sex: registrationOne.sex,
            color_race: registrationOne.color_race,
            deficiency: registrationOne.deficiency,
            avatar_url: registrationOne.avatar_url,
            zone: registrationOne.zone,
            kinship: registrationOne.kinship,
            deficiency_description: registrationOne.deficiency_description,
            responsable_name: registrationOne.responsable_name,
            responsable_cpf: registrationOne.responsable_cpf,
            responsable_telephone: registrationOne.responsable_telephone,
          };
        });

        await axios
          .post(
            process.env.BACKEND_URL +
            '/migration-bff?token=' +
            process.env.TOKEN,
            {
              project: MigrationDto.project,
              year: MigrationDto.year,
              name: MigrationDto.name,
              registration: body,
            },
          )
          .catch((erro) => {
            console.log(erro);
          });

        return { message: 'Migração feita com sucesso!' };
      });

      return transactionResult;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async migrationMeuBentocoded(
    MigrationDto: MigrationMeubenToCodedDto,
    user: JwtPayload,
  ) {
    try {
      const classroomOneMeuben = await this.findClassroomOne(
        MigrationDto.idClassroom.toString(),
      );

      if (!classroomOneMeuben) {
        throw new HttpException(
          'Turma não encontrada!',
          HttpStatus.BAD_REQUEST,
        );
      }
      const transactionResult = this.prisma.$transaction(async (tx) => {
        const classroomCoded = await tx.classroom.findFirst({
          where: {
            idClassroomMeuBen: classroomOneMeuben.id,
          },
        });

        var classroom

        if (classroomCoded) {
          classroom = await tx.classroom.update({
            where: {
              id: classroomCoded.id,
            },
            data: {
              name: classroomOneMeuben.name
            },
          });
        } else {
          classroom = await tx.classroom.create({
            data: {
              name: classroomOneMeuben.name,
              owner_user_fk: user.id,
              idClassroomMeuBen: classroomOneMeuben.id,
              reapplication: { connect: { id: MigrationDto.idReaplication } },
            },
          });

        }


        function normalizeBirthday(rawBirthday: string | Date) {
          const birthdayValue =
            rawBirthday instanceof Date
              ? rawBirthday.toISOString().slice(0, 10)
              : String(rawBirthday ?? '').trim();

          const brFormat = birthdayValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          const isoFormat = birthdayValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

          let day: number;
          let month: number;
          let year: number;

          if (brFormat) {
            day = parseInt(brFormat[1], 10);
            month = parseInt(brFormat[2], 10);
            year = parseInt(brFormat[3], 10);
          } else if (isoFormat) {
            year = parseInt(isoFormat[1], 10);
            month = parseInt(isoFormat[2], 10);
            day = parseInt(isoFormat[3], 10);
          } else {
            const fallback = new Date(birthdayValue);
            if (Number.isNaN(fallback.getTime())) {
              throw new HttpException(
                `Data de nascimento inválida: ${birthdayValue}`,
                HttpStatus.BAD_REQUEST,
              );
            }
            year = fallback.getUTCFullYear();
            month = fallback.getUTCMonth() + 1;
            day = fallback.getUTCDate();
          }

          if (month < 1) month = 1;
          if (month > 12) month = 12;
          if (year < 1900) year = 1900;
          if (year > 2100) year = 2100;

          const lastDayOfMonth = new Date(year, month, 0).getDate();
          if (day < 1) day = 1;
          if (day > lastDayOfMonth) day = lastDayOfMonth;

          return {
            birthdayDate: new Date(year, month - 1, day),
            passwordSeed: `${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}${year}`,
          };
        }

        function getFirstName(fullName) {
          return fullName
            .trim()
            .split(' ')[0]
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        }

        for (const register_classroom of classroomOneMeuben.register_classroom) {
          if (register_classroom) {


            var registration = register_classroom.registration;
            const regi = await tx.registration.findFirst({
              where: {
                OR: [
                  {
                    idRegistrationMeuBen: registration.id,
                  },
                  {
                    cpf: {
                      not: '',
                      equals: registration.cpf,
                    },
                  },
                ],
              },
              include: {
                user: true,
              },
            });

            const normalizedBirthday = normalizeBirthday(registration.birthday);

            if (!regi) {
              const hashedPassword = await this.userServices.hashPassword(
                normalizedBirthday.passwordSeed,
              );

              const user = await tx.users.create({
                data: {
                  name: registration.name,
                  email: registration.cpf ? registration.cpf :
                    getFirstName(registration.name) +
                    '#' +
                    normalizedBirthday.passwordSeed,
                  password: hashedPassword,
                  role: 'STUDENT',
                },
              });

              await tx.registration.create({
                data: {
                  birthday: normalizedBirthday.birthdayDate,
                  color_race: registration.color_race,
                  deficiency: registration.deficiency,
                  sex: registration.sex,
                  zone: registration.zone,
                  cpf: registration.cpf,
                  responsable_name: registration.responsable_name,
                  responsable_telephone: registration.responsable_telephone,
                  kinship: registration.kinship,
                  responsable_cpf: registration.responsable_cpf,
                  idRegistrationMeuBen: registration.id,
                  user: { connect: { id: user.id } },
                },
              });

              await tx.user_classroom.create({
                data: {
                  classroom: {
                    connect: {
                      id: classroom.id,
                    },
                  },
                  users: {
                    connect: {
                      id: user.id,
                    },
                  },
                },
              });
            } else {

              await tx.registration.update({
                where: {
                  id: regi.id,
                },
                data: {
                  birthday: normalizedBirthday.birthdayDate,
                  color_race: registration.color_race,
                  deficiency: registration.deficiency,
                  sex: registration.sex,
                  zone: registration.zone,
                  cpf: registration.cpf,
                  responsable_name: registration.responsable_name,
                  responsable_telephone: registration.responsable_telephone,
                  kinship: registration.kinship,
                  responsable_cpf: registration.responsable_cpf,
                  idRegistrationMeuBen: registration.id,
                },
              });
              const userClassroom = await tx.user_classroom.findFirst({
                where: {
                  classroom: {
                    id: classroom.id,
                  },
                  users: {
                    id: regi.user.id,
                  },
                },
              });

              if (!userClassroom) {
                await tx.user_classroom.create({
                  data: {
                    classroom: {
                      connect: {
                        id: classroom.id,
                      },
                    },
                    users: {
                      connect: {
                        id: regi.user.id,
                      },
                    },
                  },
                });
              }
            }
          }
        }

        return { message: 'Migração feita com sucesso!' };
      });

      return transactionResult;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findTsAll() {
    try {
      const ts = await axios.get(
        process.env.BACKEND_URL + '/migration-bff?token=' + process.env.TOKEN,
      );
      return ts.data;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findClassroomList(id: string) {
    try {
      const classroomList = await axios.get(
        process.env.BACKEND_URL +
        '/migration-bff/classroom-list?token=' +
        process.env.TOKEN +
        '&idProject=' +
        id,
      );
      return classroomList.data;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findClassroomOne(id: string) {
    try {
      const classroomOne = await axios.get(
        process.env.BACKEND_URL +
        '/migration-bff/classroom-one?token=' +
        process.env.TOKEN +
        '&idClassroom=' +
        id,
      );
      return classroomOne.data;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
