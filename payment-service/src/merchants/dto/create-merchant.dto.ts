import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateMerchantDto {
  @IsString({
    message: 'name debe ser un texto valido',
  })
  @IsNotEmpty({
    message: 'name es requerido',
  })
  @Matches(/\S/, {
    message: 'name debe contener al menos un caracter visible',
  })
  @MaxLength(150, {
    message: 'name no puede superar los 150 caracteres',
  })
  name!: string;

  @IsEmail(
    {},
    {
      message: 'email debe ser una direccion valida',
    },
  )
  @MaxLength(320, {
    message: 'email no puede superar los 320 caracteres',
  })
  email!: string;
}
