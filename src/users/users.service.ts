import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async create(
    email: string,
    name: string,
    password: string,
    channel_name: string,
    emailVerificationToken?: string,
    emailVerificationExpires?: Date,
  ) {
    const existingByEmail = await this.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictException('Email already registered');
    }
    const existingByChannel = await this.findByChannelName(channel_name);
    if (existingByChannel) {
      throw new ConflictException('Channel name already taken');
    }
    const hash = await bcrypt.hash(password, 10);
    const user = this.repo.create({
      email,
      name,
      password: hash,
      channel_name,
      email_verified: false,
      email_verification_token: emailVerificationToken ?? null,
      email_verification_expires: emailVerificationExpires ?? null,
    });
    return this.repo.save(user);
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async findByChannelName(channel_name: string) {
    return this.repo.findOne({ where: { channel_name } });
  }

  async findByVerificationToken(token: string) {
    return this.repo.findOne({ where: { email_verification_token: token } });
  }

  async confirmEmailByToken(token: string): Promise<User> {
    const user = await this.findByVerificationToken(token);
    if (!user || !user.email_verification_expires) {
      throw new BadRequestException('Invalid or expired confirmation link.');
    }
    if (user.email_verification_expires < new Date()) {
      throw new BadRequestException('Confirmation link has expired.');
    }
    user.email_verified = true;
    user.email_verification_token = null;
    user.email_verification_expires = null;
    return this.repo.save(user);
  }

  async regenerateVerificationToken(email: string): Promise<{ token: string; expires: Date } | null> {
    const user = await this.findByEmail(email);
    if (!user || user.email_verified) {
      return null;
    }
    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.email_verification_token = token;
    user.email_verification_expires = expires;
    await this.repo.save(user);
    return { token, expires };
  }

  async validatePassword(email: string, plainPassword: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(plainPassword, user.password);
    return match ? user : null;
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  remove(id: string) {
    return this.repo.delete(id);
  }

  async searchUsers(query: string, excludeUserId?: string) {
    const searchTerm = `%${query}%`;
    const queryBuilder = this.repo
      .createQueryBuilder('user')
      .where('(user.email LIKE :searchTerm OR user.name LIKE :searchTerm)', { searchTerm })
      .select(['user.id', 'user.email', 'user.name', 'user.channel_name'])
      .limit(20);

    if (excludeUserId) {
      queryBuilder.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    return queryBuilder.getMany();
  }
}