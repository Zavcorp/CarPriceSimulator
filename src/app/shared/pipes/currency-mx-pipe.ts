import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({
  name: 'appCurrencyMx',
})
export class CurrencyMxPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return value;
  }

}
