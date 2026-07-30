import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatEnum',
  standalone: true
})
export class FormatEnumPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
