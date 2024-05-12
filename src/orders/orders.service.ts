import { BadRequestException, HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';


import { PrismaClient } from '@prisma/client';
import { ChangeOrderStatusDto, CreateOrderDto, OrderPaginationDto } from './dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PRODUCT_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';


@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrderService')

  constructor(
    @Inject(PRODUCT_SERVICE)
    private readonly productsClient: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('OrderService connected to database');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {

      const productsIds = createOrderDto.items.map(item => item.productId)

      const products: any [] = await firstValueFrom(
        this.productsClient.send({ cmd: 'validateProducts' }, productsIds)
      )

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(product => product.id === orderItem.productId).price;
        return acc + (price * orderItem.quantity)
      }, 0)

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0)

      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map( (orderItem) => ({
                productsId: orderItem.productId,
                quantity: orderItem.quantity,
                price: products.find(product => product.id === orderItem.productId).price,
              }))
            }
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productsId: true,
            }
          }
        }
      })

      return {
        ...order,
        OrderItem: order.OrderItem.map(item => ({
          ...item,
          name: products.find(product => product.id === item.productsId).name
        }))
      }
    } catch (error) {
      throw new RpcException({
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      });
    }
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
