import { Injectable, Logger, OnModuleInit } from '@nestjs/common';


import { PrismaClient } from '@prisma/client';
import { CreateOrderDto } from './dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit{

  private readonly logger = new Logger('OrderService')

  async onModuleInit() {
    await this.$connect();
    this.logger.log('OrderService connected to database');
  }

  create(createOrderDto: CreateOrderDto) {
    return createOrderDto;
  }

  findAll() {
    return `This action returns all orders`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  changeStatus(){
    return `This action changes the status of an order`;
  }
}
