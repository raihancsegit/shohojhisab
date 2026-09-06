/**
 * Web Bluetooth ESC/POS Thermal Printer Driver for ShohojHisab
 * Supports standard 58mm / 80mm Bluetooth mini thermal printers on Android/Chrome/Windows
 */

export interface BluetoothPrinterReceipt {
  shopName: string;
  shopLocation?: string;
  shopPhone?: string;
  invoiceNo: string;
  date: string;
  customerName?: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  total: number;
  paid: number;
  due?: number;
  footerNote?: string;
}

// ESC/POS Command Constants
const ESC = '\x1B';
const GS = '\x1D';

export class BluetoothThermalPrinter {
  private device: any = null;
  private characteristic: any = null;

  async connect(): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof window === 'undefined' || !(navigator as any).bluetooth) {
        return {
          success: false,
          error: 'আপনার ব্রাউজারে Web Bluetooth সাপোর্ট নেই। দয়া করে Chrome বা Edge ব্যবহার করুন।'
        };
      }

      // Request Bluetooth Device for standard ESC/POS Printer Services
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { services: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2'] },
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'MTP' },
          { namePrefix: 'MPT' },
          { namePrefix: 'RPP' },
          { namePrefix: 'Blue' }
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'
        ]
      });

      const server = await this.device.gatt.connect();
      
      // Look up primary print characteristic
      let service: any;
      try {
        service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      } catch (e) {
        service = await server.getPrimaryServices();
        service = service[0];
      }

      const characteristics = await service.getCharacteristics();
      this.characteristic = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);

      if (!this.characteristic) {
        return { success: false, error: 'প্রিন্টারের রাইট সার্ভিস পাওয়া যায়নি।' };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Bluetooth connection error:', err);
      return { success: false, error: err.message || 'ব্লুটুথ কানেকশন ব্যর্থ হয়েছে' };
    }
  }

  async printReceipt(receipt: BluetoothPrinterReceipt): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.characteristic) {
        const conn = await this.connect();
        if (!conn.success) return conn;
      }

      let cmd = '';
      // Initialize printer
      cmd += ESC + '@';
      // Center Align Header
      cmd += ESC + 'a' + '\x01';
      // Double height & width for shop name
      cmd += ESC + '!' + '\x38';
      cmd += receipt.shopName + '\n';
      // Normal font
      cmd += ESC + '!' + '\x00';
      if (receipt.shopLocation) cmd += receipt.shopLocation + '\n';
      if (receipt.shopPhone) cmd += 'Mobile: ' + receipt.shopPhone + '\n';
      cmd += '--------------------------------\n';
      // Left Align for Details
      cmd += ESC + 'a' + '\x00';
      cmd += 'Memo: ' + receipt.invoiceNo + '\n';
      cmd += 'Date: ' + receipt.date + '\n';
      if (receipt.customerName) cmd += 'Customer: ' + receipt.customerName + '\n';
      cmd += '================================\n';
      cmd += 'Item              Qty  Rate  Amt\n';
      cmd += '--------------------------------\n';

      receipt.items.forEach(item => {
        const nameCol = (item.name.substring(0, 16)).padEnd(16, ' ');
        const qtyCol = String(item.qty).padStart(4, ' ');
        const rateCol = String(item.price).padStart(5, ' ');
        const amtCol = String(item.total).padStart(6, ' ');
        cmd += `${nameCol}${qtyCol}${rateCol}${amtCol}\n`;
      });

      cmd += '--------------------------------\n';
      // Right align summary
      cmd += ESC + 'a' + '\x02';
      cmd += `Subtotal: Tk ${receipt.subtotal}\n`;
      if (receipt.discount && receipt.discount > 0) {
        cmd += `Discount: Tk ${receipt.discount}\n`;
      }
      cmd += ESC + '!' + '\x08'; // Bold
      cmd += `TOTAL: Tk ${receipt.total}\n`;
      cmd += ESC + '!' + '\x00';
      cmd += `Paid: Tk ${receipt.paid}\n`;
      if (receipt.due && receipt.due > 0) {
        cmd += `Due: Tk ${receipt.due}\n`;
      }
      
      // Center footer
      cmd += ESC + 'a' + '\x01';
      cmd += '\n';
      cmd += (receipt.footerNote || 'Thank you for shopping with us!') + '\n';
      cmd += 'ShohojHisab Smart POS\n';
      cmd += '\n\n\n';
      // Cut paper
      cmd += GS + 'V' + '\x41' + '\x00';

      const encoder = new TextEncoder();
      const buffer = encoder.encode(cmd);

      // Send in chunks of 100 bytes to avoid BLE buffer overflow
      const chunkSize = 100;
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize);
        await this.characteristic.writeValue(chunk);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Printing error:', err);
      return { success: false, error: err.message || 'প্রিন্ট করতে ব্যর্থ হয়েছে।' };
    }
  }
}

export const bluetoothPrinter = new BluetoothThermalPrinter();
