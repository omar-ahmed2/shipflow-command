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
   * Create a new user - tries Edge Function first, falls back to direct creation
   */
  createUser: async (params: CreateUserParams) => {
    try {
      // Use RPC directly as it's more reliable for this setup
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_user_complete', {
        p_email: params.email,
        p_password: params.password || '12345678',
        p_name: params.name,
        p_role: params.role,
        p_phone: params.phone || null,
        p_meta: {
          zone: params.zone,
          vehicleType: params.vehicleType,
          storeName: params.storeName,
          address: params.address,
          notes: params.notes
        }
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        // Special case for missing function
        if (rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
          throw new Error('قاعدة البيانات تحتاج لتحديث. يرجى تشغيل كود SQL المرفق في لوحة تحكم Supabase.');
        }
        throw new Error(rpcError.message || 'فشل في إنشاء المستخدم');
      }

      const result = rpcResult as { success?: boolean; error?: string; userId?: string; message?: string };
      
      if (!result?.success) {
        throw new Error(result?.error || 'فشل في إنشاء المستخدم');
      }

      return {
        success: true,
        code: 'USER_CREATED',
        user: {
          id: result.userId,
          email: params.email,
          role: params.role,
          name: params.name,
          tempPassword: params.password ? undefined : '12345678'
        }
      };
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
