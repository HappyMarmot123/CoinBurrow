import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
const rateLimit = require('axios-rate-limit');
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { sign } from 'jsonwebtoken';

// TODO:
// nonce: "Number used once"의 약자로, 각 API 요청마다 생성되는 고유한 값
// 유효 API 요청을 가로채서 재전송하지 못하게 하는 보안 기능
// nonce 값을 가진 요청이 다시 들어오면 요청 거부.
//
// 요청 파라미터를 문자열로 변환 후 암호화하여 전송

@Injectable()
export class UpbitApiService {
  private readonly axiosInstance: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const apiUrl = this.configService.get<string>('UPBIT_API_URL');

    this.axiosInstance = rateLimit(
      axios.create({
        baseURL: apiUrl,
      }),
      { maxRequests: 1, perMilliseconds: 1000 },
    );
  }

  get instance(): AxiosInstance {
    return this.axiosInstance;
  }
}
