export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const decimalPart = Math.round((num % 1) * 100);
  const integerPart = Math.floor(num);

  let words = convertIntegerToWords(integerPart) + ' Rupees';

  if (decimalPart > 0) {
    words += ' and ' + convertIntegerToWords(decimalPart) + ' Paise';
  }

  return words + ' Only';
}

function convertIntegerToWords(num: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  if (num === 0) return 'Zero';

  function helper(n: number): string {
    let str = '';
    if (n >= 10000000) {
      str += helper(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += helper(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += helper(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += helper(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  return helper(num);
}
