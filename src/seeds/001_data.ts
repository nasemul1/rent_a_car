import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  await knex('rentals').del();
  await knex('vehicles').del();
  await knex('staff').del();

  const hash = await bcrypt.hash('password123', 10);

  const staff = await knex('staff')
    .insert([
      { email: 'admin@rental.com', password_hash: hash, name: 'Admin User' },
      { email: 'staff1@rental.com', password_hash: hash, name: 'Staff One' },
      { email: 'staff2@rental.com', password_hash: hash, name: 'Staff Two' },
    ])
    .returning('id');

  const vehicles = await knex('vehicles')
    .insert([
      { name: 'Toyota Camry', plate_number: 'ABC-1234', category: 'Sedan', daily_rate: 50.0 },
      { name: 'Honda CR-V', plate_number: 'DEF-5678', category: 'SUV', daily_rate: 75.0 },
      { name: 'Ford F-150', plate_number: 'GHI-9012', category: 'Truck', daily_rate: 100.0 },
      { name: 'Tesla Model 3', plate_number: 'JKL-3456', category: 'Electric', daily_rate: 80.0 },
      { name: 'Chevrolet Malibu', plate_number: 'MNO-7890', category: 'Sedan', daily_rate: 45.0 },
      { name: 'Jeep Wrangler', plate_number: 'PQR-1234', category: 'SUV', daily_rate: 90.0 },
      { name: 'Toyota Hilux', plate_number: 'STU-5678', category: 'Truck', daily_rate: 85.0 },
      { name: 'BMW 3 Series', plate_number: 'VWX-9012', category: 'Luxury', daily_rate: 120.0 },
      { name: 'Hyundai Tucson', plate_number: 'YZA-3456', category: 'SUV', daily_rate: 70.0 },
      { name: 'Nissan Altima', plate_number: 'BCD-7890', category: 'Sedan', daily_rate: 48.0 },
    ])
    .returning('id');

  await knex('rentals').insert([
    // Rental spanning July-August (for report testing)
    {
      vehicle_id: vehicles[0].id,
      customer_name: 'John Doe',
      customer_phone: '555-0101',
      start_date: '2026-07-28',
      end_date: '2026-08-03',
      total_amount: 300.0,
      status: 'completed',
    },
    // August rentals
    {
      vehicle_id: vehicles[1].id,
      customer_name: 'Jane Smith',
      customer_phone: '555-0102',
      start_date: '2026-08-01',
      end_date: '2026-08-05',
      total_amount: 375.0,
      status: 'completed',
    },
    {
      vehicle_id: vehicles[2].id,
      customer_name: 'Bob Johnson',
      customer_phone: '555-0103',
      start_date: '2026-08-10',
      end_date: '2026-08-15',
      total_amount: 500.0,
      status: 'ongoing',
    },
    {
      vehicle_id: vehicles[3].id,
      customer_name: 'Alice Brown',
      customer_phone: '555-0104',
      start_date: '2026-08-20',
      end_date: '2026-08-25',
      total_amount: 400.0,
      status: 'booked',
    },
    // July rentals
    {
      vehicle_id: vehicles[4].id,
      customer_name: 'Charlie Wilson',
      customer_phone: '555-0105',
      start_date: '2026-07-01',
      end_date: '2026-07-05',
      total_amount: 225.0,
      status: 'completed',
    },
    {
      vehicle_id: vehicles[5].id,
      customer_name: 'Diana Lee',
      customer_phone: '555-0106',
      start_date: '2026-07-10',
      end_date: '2026-07-15',
      total_amount: 450.0,
      status: 'completed',
    },
    {
      vehicle_id: vehicles[6].id,
      customer_name: 'Edward Davis',
      customer_phone: '555-0107',
      start_date: '2026-07-20',
      end_date: '2026-07-25',
      total_amount: 425.0,
      status: 'completed',
    },
    // September rental
    {
      vehicle_id: vehicles[7].id,
      customer_name: 'Fiona Garcia',
      customer_phone: '555-0108',
      start_date: '2026-09-01',
      end_date: '2026-09-05',
      total_amount: 600.0,
      status: 'booked',
    },
    // More August rentals
    {
      vehicle_id: vehicles[8].id,
      customer_name: 'George Martinez',
      customer_phone: '555-0109',
      start_date: '2026-08-05',
      end_date: '2026-08-10',
      total_amount: 350.0,
      status: 'completed',
    },
    {
      vehicle_id: vehicles[9].id,
      customer_name: 'Helen Anderson',
      customer_phone: '555-0110',
      start_date: '2026-08-15',
      end_date: '2026-08-20',
      total_amount: 240.0,
      status: 'cancelled',
    },
    {
      vehicle_id: vehicles[0].id,
      customer_name: 'Ivan Thomas',
      customer_phone: '555-0111',
      start_date: '2026-08-25',
      end_date: '2026-08-30',
      total_amount: 250.0,
      status: 'booked',
    },
  ]);
}
