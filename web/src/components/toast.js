/**
 * Toast utility
 * Thin wrapper around react-toastify so the rest of the app
 * imports from one place and we can swap the library later.
 *
 * Usage:
 *   import toast from '../components/toast';
 *   toast.success('Product saved!');
 *   toast.error('Something went wrong');
 *   toast.info('Order status updated');
 */

import { toast as _toast } from 'react-toastify';

const toast = {
  success: (msg) => _toast.success(msg),
  error:   (msg) => _toast.error(msg),
  info:    (msg) => _toast.info(msg),
  warning: (msg) => _toast.warning(msg)
};

export default toast;
