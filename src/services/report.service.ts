import { rentalRepository } from '../repositories/rental.repository';

export class ReportService {
  async getMonthlyReport(month: string, vehicleId?: number) {
    const vehicles = await rentalRepository.getMonthlyReport(month, vehicleId);
    const top_vehicle = vehicles.length > 0 ? vehicles[0] : null;
    return { vehicles, top_vehicle };
  }
}

export const reportService = new ReportService();
