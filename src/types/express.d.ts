import { Staff } from './index';

declare global {
  namespace Express {
    interface Request {
      staff?: Pick<Staff, 'id' | 'email' | 'name'>;
    }
  }
}
