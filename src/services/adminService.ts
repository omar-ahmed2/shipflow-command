import { supabase } from '@/lib/supabase';

export interface CreateUserParams {
  email: string;
  password?: string;
  name: string;
  role: 'courier' | 'seller';
  phone: string;
  // Specific fields for couriers/sellers
  zone?: string;
  vehicleType?: string;
  storeName?: string;
  address?: string;
  notes?: string;
}

export const adminService = {
  /**
   * Calls the create-user Edge Function to create a new Auth user
   * and sync their profile data in one secure step.
   */
  createUser: async (params: CreateUserParams) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.');
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          email: params.email,
          password: params.password || '12345678',
          name: params.name,
          role: params.role,
          meta: {
            phone: params.phone,
            zone: params.zone,
            vehicleType: params.vehicleType,
            storeName: params.storeName,
            address: params.address,
            notes: params.notes
          }
        }
      });

      if (error) {
        console.error('Supabase Function Invoke Error:', error);
        // التحقق من نوع الخطأ القادم من سوبابيز
        const errorMessage = error.message || (typeof data === 'object' && data?.error) || 'فشل في إنشاء الحساب';
        throw new Error(errorMessage);
      }

      return data;
    } catch (err: any) {
      console.error('CreateUser Service Catch:', err);
      throw err;
    }
  },

  /**
   * Updates user status (active/inactive)
   */
  updateUserStatus: async (userId: string, status: 'active' | 'inactive') => {
    const { error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId);
    
    if (error) throw error;
  },

  /**
   * Resets a user's password. 
   * Note: This usually requires a specialized Edge Function if the admin 
   * wants to set it manually without the user's current password.
   */
  resetPassword: async (userId: string, newPassword: string) => {
    // For now, we'll assume a 'reset-password' function exists or we use admin api if available
    // Since we want to keep it simple, we might need another Edge Function for this.
    // However, Supabase client's updateUser doesn't work for OTHER users.
    throw new Error('Please implement reset-password Edge Function or use Supabase Dashboard for now.');
  }
};
