import { BadRequestException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';


import { PrismaClient } from '@prisma/client';
import { ChangeOrderStatusDto, CreateOrderDto, OrderPaginationDto } from './dto';
import { RpcException } from '@nestjs/microservices';


@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrderService')

  async onModuleInit() {
    await this.$connect();
    this.logger.log('OrderService connected to database');
  }

  async create(createOrderDto: CreateOrderDto) {
    const order = await this.order.create({ data: createOrderDto });
    return order;
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { limit, page, status } = orderPaginationDto;

    const [totalOrders, products] = await Promise.all([
      this.order.count({ where: { status } }),
      this.order.findMany({
        where: { status },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    return {
      totalOrders,
      page,
      totalPages,
      next: (totalOrders - (page * limit)) > 0 ? `/orders?page=${page + 1}&limit=${limit}` : null,
      prev: (page - 1 > 0) ? `/orders?page=${page - 1}&limit=${limit}` : null,
      products
    }
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id }
    });
    if (!order) throw new RpcException({
      message: `Order not found with id #${id}`,
      statusCode: HttpStatus.NOT_FOUND
    });
    return order;
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);

    if (order.status === status) return order;

    return this.order.update({
      where: { id },
      data: { status }
    })
  }
}
