import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateHealthDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  serviceName?: string;
}
