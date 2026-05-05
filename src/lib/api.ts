import { supabase, checkConnectionHealth } from './supabase';
import { cache, cacheKeys } from './cache';
import type { Tables } from '@/types/supabase';

// Error handling types
type ConnectionError = {
  message: string;
  code?: string;
  isConnectionError: boolean;
}

// Check if error is connection-related
function isConnectionError(error: any): boolean {
  if (!error) return false
  const message = error.message?.toLowerCase() || ''
  const code = error.code?.toLowerCase() || ''
  
  return (
    message.includes('too many connections') ||
    message.includes('connection') ||
    message.includes('pool') ||
    message.includes('timeout') ||
    code === '08006' || // connection_failure
    code === '08000' || // connection_exception
    code === '53300'   // too_many_connections
  )
}

// Retry logic with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry if not a connection error
      if (!isConnectionError(error)) {
        throw error
      }
      
      // Clear cache on connection error to prevent stale data
      if (attempt === 0) {
        cache.clear()
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`Connection error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Optimized query wrapper with caching
async function withCacheAndRetry<T>(
  fn: () => Promise<T>,
  cacheKey: string,
  ttl: number = 30000,
  maxRetries: number = 3
): Promise<T> {
  // Try cache first
  const cached = cache.get<T>(cacheKey)
  if (cached !== null) {
    return cached
  }
  
  // Execute with retry
  const result = await withRetry(fn, maxRetries)
  
  // Store in cache
  cache.set(cacheKey, result, ttl)
  
  return result
}

// Invalidate cache helper
export function invalidateCache(key: string | string[]): void {
  if (Array.isArray(key)) {
    key.forEach(k => cache.delete(k))
  } else {
    cache.delete(key)
  }
}

/**
 * Mapping helpers to convert Supabase snake_case to Frontend camelCase
 */

export const mapShipment = (s: Tables<'shipments'>) => ({
  id: s.id,
  trackingId: s.tracking_id,
  customerName: s.customer_name,
  customerPhone: s.customer_phone,
  address: s.address,
  city: s.city,
  governorate: s.governorate,
  price: s.price,
  paymentType: s.payment_type,
  codCollected: s.cod_collected,
  courierCollected: s.courier_collected,
  shippingFee: s.shipping_fee,
  sellerSettled: s.seller_settled,
  status: s.status,
  courierId: s.courier_id,
  sellerId: s.seller_id,
  createdBy: s.created_by,
  verificationCode: s.verification_code,
  notes: s.notes,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
  deliveredAt: s.delivered_at,
});

export const mapCourier = (c: Tables<'couriers'>) => ({
  id: c.id,
  userId: c.user_id,
  name: c.name,
  phone: c.phone,
  zone: c.zone,
  vehicleType: c.vehicle_type,
  status: c.status,
  joinDate: c.join_date,
  notes: c.notes,
});

export const mapSeller = (s: Tables<'sellers'>) => ({
  id: s.id,
  userId: s.user_id,
  storeName: s.store_name,
  phone: s.phone,
  address: s.address,
  joinDate: s.join_date,
  status: s.status,
});

export const api = {
  shipments: {
    getAll: async (options?: { useCache?: boolean }) => {
      const fn = async () => {
        const { data, error } = await supabase.from('shipments').select('*').order('created_at', { ascending: false }).limit(1000);
        if (error) throw error;
        return data.map(mapShipment);
      };
      
      if (options?.useCache) {
        return withCacheAndRetry(fn, cacheKeys.shipments(), 30000);
      }
      return withRetry(fn);
    },
    getById: async (id: string) => {
      const fn = async () => {
        const { data, error } = await supabase.from('shipments').select('*').eq('id', id).single();
        if (error) throw error;
        return mapShipment(data);
      };
      return withRetry(fn);
    },
    delete: async (id: string) => {
      const fn = async () => {
        const { error } = await supabase.from('shipments').delete().eq('id', id);
        if (error) throw error;
      };
      await withRetry(fn);
      // Invalidate cache
      invalidateCache([cacheKeys.shipments(), cacheKeys.shipments('courier'), cacheKeys.shipments('seller')]);
    },
    getByCourierId: async (courierId: string, options?: { useCache?: boolean }) => {
      const fn = async () => {
        const { data, error } = await supabase.from('shipments')
          .select('*')
          .eq('courier_id', courierId)
          .order('created_at', { ascending: false })
          .limit(500);
        if (error) throw error;
        return data.map(mapShipment);
      };
      
      if (options?.useCache) {
        return withCacheAndRetry(fn, cacheKeys.courierShipments(courierId), 20000);
      }
      return withRetry(fn);
    },
    getBySellerId: async (sellerId: string, options?: { useCache?: boolean }) => {
      const fn = async () => {
        const { data, error } = await supabase.from('shipments')
          .select('*')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false })
          .limit(500);
        if (error) throw error;
        return data.map(mapShipment);
      };
      
      if (options?.useCache) {
        return withCacheAndRetry(fn, cacheKeys.sellerShipments(sellerId), 20000);
      }
      return withRetry(fn);
    },
    create: async (shipment: any) => {
      // Map to snake_case for DB
      const dbShipment = {
        tracking_id: shipment.trackingId,
        customer_name: shipment.customerName,
        customer_phone: shipment.customerPhone,
        address: shipment.address,
        city: shipment.city,
        governorate: shipment.governorate,
        price: shipment.price,
        shipping_fee: shipment.shippingFee,
        payment_type: shipment.paymentType,
        status: shipment.status,
        courier_id: shipment.courierId,
        seller_id: shipment.sellerId,
        created_by: shipment.createdBy,
        verification_code: shipment.verificationCode,
        notes: shipment.notes
      };
      
      const { data, error } = await supabase.from('shipments').insert(dbShipment).select().single();
      if (error) throw error;
      return mapShipment(data);
    },
    addEvent: async (event: any) => {
      const { error } = await supabase.from('shipment_events').insert({
        shipment_id: event.shipmentId,
        status: event.status,
        actor: event.actor,
        actor_role: event.actorRole,
        note: event.notes
      });
      if (error) throw error;
    },
    getEvents: async (shipmentId: string) => {
      const fn = async () => {
        const { data, error } = await supabase.from('shipment_events')
          .select('*')
          .eq('shipment_id', shipmentId)
          .order('timestamp', { ascending: false })
          .limit(50);
        if (error) throw error;
        return data.map(e => ({
          id: e.id,
          shipmentId: e.shipment_id,
          status: e.status,
          actor: e.actor,
          actorRole: e.actor_role,
          notes: e.note,
          timestamp: e.timestamp
        }));
      };
      return withRetry(fn);
    },
    update: async (id: string, updates: any) => {
      const fn = async () => {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.courierId !== undefined) dbUpdates.courier_id = updates.courierId;
        if (updates.deliveredAt) dbUpdates.delivered_at = updates.deliveredAt;
        if (updates.updatedAt) dbUpdates.updated_at = updates.updatedAt;
        if (updates.courierCollected !== undefined) dbUpdates.courier_collected = updates.courierCollected;
        
        const { error } = await supabase.from('shipments').update(dbUpdates).eq('id', id);
        if (error) throw error;
      };
      await withRetry(fn);
      // Invalidate related caches
      invalidateCache([cacheKeys.shipments(), cacheKeys.shipments('courier'), cacheKeys.shipments('seller')]);
    },
    bulkUpdate: async (ids: string[], updates: any) => {
      const fn = async () => {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.codCollected !== undefined) dbUpdates.cod_collected = updates.codCollected;
        if (updates.sellerSettled !== undefined) dbUpdates.seller_settled = updates.sellerSettled;
        if (updates.updatedAt) dbUpdates.updated_at = updates.updatedAt;
        
        const { error } = await supabase.from('shipments').update(dbUpdates).in('id', ids);
        if (error) throw error;
      };
      await withRetry(fn);
      invalidateCache([cacheKeys.shipments(), cacheKeys.shipments('courier'), cacheKeys.shipments('seller')]);
    },
    getTodayCount: async () => {
      const fn = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count, error } = await supabase
          .from('shipments')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());
        if (error) throw error;
        return count || 0;
      };
      return withRetry(fn);
    }
  },
  couriers: {
    getAll: async (options?: { useCache?: boolean }) => {
      const fn = async () => {
        const { data, error } = await supabase.from('couriers')
          .select('*')
          .order('join_date', { ascending: false })
          .limit(100);
        if (error) throw error;
        return data.map(mapCourier);
      };
      
      if (options?.useCache) {
        return withCacheAndRetry(fn, cacheKeys.couriers(), 60000);
      }
      return withRetry(fn);
    },
    getById: async (id: string) => {
      const fn = async () => {
        const { data, error } = await supabase.from('couriers').select('*').eq('id', id).single();
        if (error) throw error;
        return mapCourier(data);
      };
      return withRetry(fn);
    }
  },
  sellers: {
    getAll: async (options?: { useCache?: boolean }) => {
      const fn = async () => {
        const { data, error } = await supabase.from('sellers')
          .select('*')
          .order('join_date', { ascending: false })
          .limit(100);
        if (error) throw error;
        return data.map(mapSeller);
      };
      
      if (options?.useCache) {
        return withCacheAndRetry(fn, cacheKeys.sellers(), 60000);
      }
      return withRetry(fn);
    },
    getById: async (id: string) => {
      const fn = async () => {
        const { data, error } = await supabase.from('sellers').select('*').eq('id', id).single();
        if (error) throw error;
        return mapSeller(data);
      };
      return withRetry(fn);
    },
    getByUserId: async (userId: string) => {
      const fn = async () => {
        const { data, error } = await supabase.from('sellers').select('*').eq('user_id', userId).single();
        if (error) throw error;
        return mapSeller(data);
      };
      return withRetry(fn);
    }
  },
  settlements: {
    getAll: async () => {
      const { data, error } = await supabase.from('settlements').select('*, users!settlements_admin_id_fkey(name)').order('date', { ascending: false });
      if (error) throw error;
      return data.map(s => ({
        id: s.id,
        courierId: s.courier_id,
        sellerId: s.seller_id,
        amount: s.amount,
        shipmentCount: s.shipment_count,
        date: s.date,
        adminId: s.admin_id,
        adminName: (s as any).users?.name || 'مدير النظام'
      }));
    },
    getByCourierId: async (courierId: string) => {
      const { data, error } = await supabase.from('settlements').select('*, users!settlements_admin_id_fkey(name)').eq('courier_id', courierId).order('date', { ascending: false });
      if (error) throw error;
      return data.map(s => ({
        id: s.id,
        courierId: s.courier_id,
        sellerId: s.seller_id,
        amount: s.amount,
        shipmentCount: s.shipment_count,
        date: s.date,
        adminId: s.admin_id,
        adminName: (s as any).users?.name || 'مدير النظام'
      }));
    },
    getBySellerId: async (sellerId: string) => {
      const { data, error } = await supabase.from('settlements').select('*, users!settlements_admin_id_fkey(name)').eq('seller_id', sellerId).order('date', { ascending: false });
      if (error) throw error;
      return data.map(s => ({
        id: s.id,
        courierId: s.courier_id,
        sellerId: s.seller_id,
        amount: s.amount,
        shipmentCount: s.shipment_count,
        date: s.date,
        adminId: s.admin_id,
        adminName: (s as any).users?.name || 'مدير النظام'
      }));
    },
    create: async (settlement: any) => {
      const { data, error } = await supabase.from('settlements').insert({
        courier_id: settlement.courierId,
        seller_id: settlement.sellerId,
        amount: settlement.amount,
        shipment_count: settlement.shipmentCount,
        date: settlement.date,
        admin_id: settlement.adminId
      } as any).select().single();
      if (error) throw error;
      return data;
    }
  },
  users: {
    getAll: async () => {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        status: u.status,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }));
    },
    update: async (id: string, updates: Partial<Tables<'users'>>) => {
      const { error } = await supabase.from('users').update(updates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    },
    getById: async (id: string) => {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
  },
  notifications: {
    getByUser: async (role: string, userId?: string) => {
      let query = supabase.from('notifications')
        .select('*')
        .eq('target_role', role as any)
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.or(`target_user_id.eq.${userId},target_user_id.is.null`);
      } else {
        query = query.is('target_user_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(n => ({
        id: n.id,
        targetRole: n.target_role,
        targetUserId: n.target_user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        link: n.link,
        createdAt: n.created_at
      }));
    },
    update: async (id: string, updates: any) => {
      const { error } = await supabase.from('notifications').update(updates).eq('id', id);
      if (error) throw error;
    },
    create: async (notification: any) => {
      const { error } = await supabase.from('notifications').insert({
        target_role: notification.targetRole,
        target_user_id: notification.targetUserId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: notification.read || false,
        link: notification.link
      });
      if (error) throw error;
    }
  },
  // Batch RPC functions for high load (reduces multiple queries to one)
  batch: {
    // Get all dashboard stats in ONE query (replaces 6 separate queries)
    getDashboardStats: async () => {
      const fn = async () => {
        const { data, error } = await supabase.rpc('get_dashboard_stats');
        if (error) throw error;
        return data;
      };
      return withCacheAndRetry(fn, 'dashboard_stats', 30000); // Cache 30 seconds
    },
    
    // Get courier dashboard with stats in ONE query
    getCourierDashboard: async (courierId: string) => {
      const fn = async () => {
        const { data, error } = await supabase.rpc('get_courier_dashboard', {
          p_courier_id: courierId
        });
        if (error) throw error;
        return data;
      };
      return withCacheAndRetry(fn, `courier_dashboard_${courierId}`, 20000); // Cache 20 seconds
    },
    
    // Get seller dashboard with stats in ONE query
    getSellerDashboard: async (sellerId: string) => {
      const fn = async () => {
        const { data, error } = await supabase.rpc('get_seller_dashboard', {
          p_seller_id: sellerId
        });
        if (error) throw error;
        return data;
      };
      return withCacheAndRetry(fn, `seller_dashboard_${sellerId}`, 20000); // Cache 20 seconds
    },
    
    // Bulk update multiple shipments at once (reduces N queries to 1)
    bulkUpdateShipments: async (shipmentIds: string[], status: string, actorId: string, actorRole: string, note?: string) => {
      const fn = async () => {
        const { data, error } = await supabase.rpc('bulk_update_shipments', {
          p_shipment_ids: shipmentIds,
          p_status: status,
          p_actor: actorId,
          p_actor_role: actorRole,
          p_note: note || null
        });
        if (error) throw error;
        return data;
      };
      const result = await withRetry(fn);
      // Invalidate caches
      invalidateCache([cacheKeys.shipments(), cacheKeys.shipments('courier'), cacheKeys.shipments('seller')]);
      return result;
    }
  }
};
