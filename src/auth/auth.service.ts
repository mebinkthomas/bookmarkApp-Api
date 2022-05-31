/* eslint-disable prettier/prettier */
import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthDto } from "./dto";
import * as argon from "argon2";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
 
@Injectable({})
export class AuthService {
    constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService){}

    async signup(dto: AuthDto){
        try {
            //generate password hash
            const hash = await argon.hash(dto.password);
            //save new user in db
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    hash: hash
                }
            })

            //delete user.hash;
            //return the saved user
            return this.signToken(user.id, user.email);
        } catch (error) {
            if(error instanceof PrismaClientKnownRequestError){
                if(error.code === 'P2002'){
                    throw new ForbiddenException('Credentials taken')
                }
            }
        }
    }
    async signin(dto:AuthDto){
        try {
            //find user by email
            const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if(!user) {
                throw new ForbiddenException('Credentials Incorrect');
            }

            const passwordMatch = await argon.verify(user.hash, dto.password);
            if(!passwordMatch) throw new ForbiddenException('Credentials Incorrect');

            //delete user.hash;
            return this.signToken(user.id, user.email);
        } catch (error) {
            return error.response;
        }
    }

    async signToken(userId: number, email: string): Promise<{access_token: string}>{
        const payload = {
            sub: userId,
            email: email
        }
        const secret = this.config.get('JWT_SECRET');
        const token = await this.jwt.signAsync(payload, { expiresIn: '15m', secret: secret });
        return {
            access_token: token
        }
    }
}