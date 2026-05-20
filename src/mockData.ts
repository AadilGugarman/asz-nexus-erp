import { Fruit, Supplier, Customer, VehicleArrival, Invoice } from './types';

export const INITIAL_FRUITS: Fruit[] = [
  {
    id: 'f1',
    name: 'Mango',
    varieties: ['Kesar', 'Alphonso', 'Rajapuri', 'Badami', 'Langra', 'Totapuri'],
  },
  {
    id: 'f2',
    name: 'Apple',
    varieties: ['Shimla', 'Washington', 'Green Apple', 'Kinnaur Royal', 'Kashmir Delicious'],
  },
  {
    id: 'f3',
    name: 'Banana',
    varieties: ['Robusta', 'Elaichi', 'Grand Naine', 'Red Banana', 'Poovan'],
  },
  {
    id: 'f4',
    name: 'Pomegranate',
    varieties: ['Bhagwa', 'Ganesh', 'Ruby', 'Arakta'],
  },
  {
    id: 'f5',
    name: 'Grapes',
    varieties: ['Green Seedless', 'Black Jumbo', 'Sharad Seedless', 'Sonaka'],
  },
  {
    id: 'f6',
    name: 'Citrus',
    varieties: ['Nagpur Orange', 'Kinnow', 'Sweet Lime (Mosambi)'],
  },
  {
    id: 'f7',
    name: 'Watermelon',
    varieties: ['Kiran', 'Namdhari Jumbo', 'Sugar Baby'],
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Ramesh Agro Traders (Valsad)', code: 'RAT-01', phone: '+91 98240 12345', city: 'Valsad, Gujarat', previousBalance: 45000 },
  { id: 's2', name: 'Suresh Patel Orchards (Navsari)', code: 'SPO-02', phone: '+91 98765 43210', city: 'Navsari, Gujarat', previousBalance: 120000 },
  { id: 's3', name: 'Kissan Fruit Supply (Nashik)', code: 'KFS-03', phone: '+91 94220 56789', city: 'Nashik, MH', previousBalance: -15000 },
  { id: 's4', name: 'Himachal Apple Growers Coop', code: 'HAG-04', phone: '+91 98160 88990', city: 'Shimla, HP', previousBalance: 250000 },
  { id: 's5', name: 'Jalgaon Banana Syndicate', code: 'JBS-05', phone: '+91 95525 33445', city: 'Jalgaon, MH', previousBalance: 0 },
  { id: 's6', name: 'Solapur Anar Exports', code: 'SAE-06', phone: '+91 90112 44556', city: 'Solapur, MH', previousBalance: 78000 }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Metro Fresh Supermarkets', phone: '+91 99223 11223', city: 'Mumbai', previousBalance: 140000 },
  { id: 'c2', name: 'Daily Mart Chain', phone: '+91 98334 22334', city: 'Surat', previousBalance: 35000 },
  { id: 'c3', name: 'APMC Wholesaler - Omkar Traders', phone: '+91 97445 33445', city: 'Pune', previousBalance: 210000 },
  { id: 'c4', name: 'Royal Fruit Boutique', phone: '+91 96556 44556', city: 'Ahmedabad', previousBalance: 12500 },
  { id: 'c5', name: 'Green Valley Fresh', phone: '+91 95667 55667', city: 'Vadodara', previousBalance: 0 },
];

export const INITIAL_VEHICLE_ARRIVALS: VehicleArrival[] = [
  {
    id: 'va-101',
    arrivalNo: 'ARR-2026-001',
    date: '2026-05-12',
    day: 'Tuesday',
    vehicleNo: 'GJ-15-ZZ-9988',
    vehicleName: 'Tata Prima Heavy Duty',
    fruitType: 'Mango',
    totalVehicleWeight: 2650,
    driverName: 'Vikram Singh',
    notes: 'Morning load, top grade quality from Valsad orchards',
    status: 'SAVED',
    createdAt: '2026-05-12T06:30:00.000Z',
    rows: [
      { id: 'row-1', supplierId: 's1', supplierName: 'Ramesh Agro Traders (Valsad)', variety: 'Kesar', caret: 50, weight: 1000, rate: 85, amount: 85000, note: 'Grade A premium' },
      { id: 'row-2', supplierId: 's1', supplierName: 'Ramesh Agro Traders (Valsad)', variety: 'Alphonso', caret: 30, weight: 600, rate: 140, amount: 84000, note: 'Ratnagiri root' },
      { id: 'row-3', supplierId: 's2', supplierName: 'Suresh Patel Orchards (Navsari)', variety: 'Rajapuri', caret: 40, weight: 1000, rate: 45, amount: 45000, note: 'Raw for pickles' }
    ],
    totalCarets: 120,
    totalCalculatedWeight: 2600,
    totalAmount: 214000
  },
  {
    id: 'va-102',
    arrivalNo: 'ARR-2026-002',
    date: '2026-05-13',
    day: 'Wednesday',
    vehicleNo: 'MH-15-EX-4321',
    vehicleName: 'Eicher Pro Cargo',
    fruitType: 'Grapes & Pomegranate',
    totalVehicleWeight: 1800,
    driverName: 'Santosh Pawar',
    notes: 'Nashik direct express delivery',
    status: 'SAVED',
    createdAt: '2026-05-13T08:15:00.000Z',
    rows: [
      { id: 'row-4', supplierId: 's3', supplierName: 'Kissan Fruit Supply (Nashik)', variety: 'Green Seedless', caret: 60, weight: 900, rate: 70, amount: 63000, note: 'Export reject clean boxes' },
      { id: 'row-5', supplierId: 's3', supplierName: 'Kissan Fruit Supply (Nashik)', variety: 'Black Jumbo', caret: 30, weight: 450, rate: 95, amount: 42750, note: 'Super color' },
      { id: 'row-6', supplierId: 's6', supplierName: 'Solapur Anar Exports', variety: 'Bhagwa', caret: 30, weight: 450, rate: 120, amount: 54000, note: 'Deep red' }
    ],
    totalCarets: 120,
    totalCalculatedWeight: 1800,
    totalAmount: 159750
  },
  {
    id: 'va-103',
    arrivalNo: 'ARR-2026-003',
    date: '2026-05-14',
    day: 'Thursday',
    vehicleNo: 'HP-01-AA-5555',
    vehicleName: 'Ashok Leyland 12-Wheeler',
    fruitType: 'Apple',
    totalVehicleWeight: 4200,
    driverName: 'Gurpreet Singh',
    notes: 'Cold chain refrigerated container from Shimla',
    status: 'SAVED',
    createdAt: '2026-05-14T11:00:00.000Z',
    rows: [
      { id: 'row-7', supplierId: 's4', supplierName: 'Himachal Apple Growers Coop', variety: 'Shimla', caret: 100, weight: 2000, rate: 110, amount: 220000, note: 'Standard packing' },
      { id: 'row-8', supplierId: 's4', supplierName: 'Himachal Apple Growers Coop', variety: 'Washington', caret: 50, weight: 1000, rate: 160, amount: 160000, note: 'Imported wax coated' },
      { id: 'row-9', supplierId: 's4', supplierName: 'Himachal Apple Growers Coop', variety: 'Kinnaur Royal', caret: 60, weight: 1200, rate: 135, amount: 162000, note: 'Crisp & sweet' }
    ],
    totalCarets: 210,
    totalCalculatedWeight: 4200,
    totalAmount: 542000
  },
  {
    id: 'va-104',
    arrivalNo: 'ARR-2026-004',
    date: '2026-05-15',
    day: 'Friday',
    vehicleNo: 'GJ-21-MM-3434',
    vehicleName: 'Mahindra Bolero Pickup',
    fruitType: 'Banana',
    totalVehicleWeight: 1500,
    driverName: 'Dinesh Bharvad',
    notes: 'Local ripening chamber batch',
    status: 'SAVED',
    createdAt: '2026-05-15T09:45:00.000Z',
    rows: [
      { id: 'row-10', supplierId: 's5', supplierName: 'Jalgaon Banana Syndicate', variety: 'Robusta', caret: 70, weight: 1050, rate: 22, amount: 23100, note: 'Green bunches' },
      { id: 'row-11', supplierId: 's5', supplierName: 'Jalgaon Banana Syndicate', variety: 'Elaichi', caret: 30, weight: 450, rate: 48, amount: 21600, note: 'Mini sweet bananas' }
    ],
    totalCarets: 100,
    totalCalculatedWeight: 1500,
    totalAmount: 44700
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-201',
    invoiceNo: 'INV-2026-1001',
    date: '2026-05-14',
    customerId: 'c1',
    customerName: 'Metro Fresh Supermarkets',
    previousBalance: 140000,
    todayAmount: 96500,
    paidAmount: 50000,
    remainingBalance: 186500, // 140000 + 96500 - 50000
    notes: 'Dispatched via APMC Express Carrier 4',
    createdAt: '2026-05-14T14:30:00.000Z',
    items: [
      { id: 'i1', fruit: 'Mango', lotVariety: 'Kesar', caret: 20, weight: 400, rate: 95, amount: 38000 },
      { id: 'i2', fruit: 'Mango', lotVariety: 'Alphonso', caret: 15, weight: 300, rate: 155, amount: 46500 },
      { id: 'i3', fruit: 'Pomegranate', lotVariety: 'Bhagwa', caret: 10, weight: 100, rate: 120, amount: 12000 }
    ]
  },
  {
    id: 'inv-202',
    invoiceNo: 'INV-2026-1002',
    date: '2026-05-15',
    customerId: 'c3',
    customerName: 'APMC Wholesaler - Omkar Traders',
    previousBalance: 210000,
    todayAmount: 132000,
    paidAmount: 150000,
    remainingBalance: 192000, // 210000 + 132000 - 150000
    notes: 'Bulk trade transfer',
    createdAt: '2026-05-15T16:00:00.000Z',
    items: [
      { id: 'i4', fruit: 'Apple', lotVariety: 'Shimla', caret: 40, weight: 800, rate: 120, amount: 96000 },
      { id: 'i5', fruit: 'Apple', lotVariety: 'Washington', caret: 10, weight: 200, rate: 180, amount: 36000 }
    ]
  }
];
