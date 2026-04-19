import { supabase } from './supabase';
import type { Tables } from '@/types/supabase';

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
    getAll: async () => {
      const { data, error } = await supabase.from('shipments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(mapShipment);
    },
    getById: async (id: string) => {
      const { data, error } = await supabase.from('shipments').select('*').eq('id', id).single();
      if (error) throw error;
      return mapShipment(data);
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('shipments').delete().eq('id', id);
      if (error) throw error;
    },
    getByCourierId: async (courierId: string) => {
      const { data, error } = await supabase.from('shipments').select('*').eq('courier_id', courierId).order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(mapShipment);
    },
    getBySellerId: async (sellerId: string) => {
      const { data, error } = await supabase.from('shipments').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(mapShipment);
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
      const { data, error } = await supabase.from('shipment_events')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('timestamp', { ascending: false });
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
    },
    update: async (id: string, updates: any) => {
      // Map camelCase to snake_case
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.courierId !== undefined) dbUpdates.courier_id = updates.courierId;
      if (updates.deliveredAt) dbUpdates.delivered_at = updates.deliveredAt;
      if (updates.updatedAt) dbUpdates.updated_at = updates.updatedAt;
      
      const { error } = await supabase.from('shipments').update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    bulkUpdate: async (ids: string[], updates: any) => {
      // Map camelCase to snake_case
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.codCollected !== undefined) dbUpdates.cod_collected = updates.codCollected;
      if (updates.sellerSettled !== undefined) dbUpdates.seller_settled = updates.sellerSettled;
      if (updates.updatedAt) dbUpdates.updated_at = updates.updatedAt;
      
      const { error } = await supabase.from('shipments').update(dbUpdates).in('id', ids);
      if (error) throw error;
    },
    getTodayCount: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      if (error) throw error;
      return count || 0;
    }
  },
  couriers: {
    getAll: async () => {
      const { data, error } = await supabase.from('couriers').select('*').order('join_date', { ascending: false });
      if (error) throw error;
      return data.map(mapCourier);
    },
    getById: async (id: string) => {
      const { data, error } = await supabase.from('couriers').select('*').eq('id', id).single();
      if (error) throw error;
      return mapCourier(data);
    }
  },
  sellers: {
    getAll: async () => {
      const { data, error } = await supabase.from('sellers').select('*').order('join_date', { ascending: false });
      if (error) throw error;
      return data.map(mapSeller);
    },
    getById: async (id: string) => {
      const { data, error } = await supabase.from('sellers').select('*').eq('id', id).single();
      if (error) throw error;
      return mapSeller(data);
    },
    getByUserId: async (userId: string) => {
      const { data, error } = await supabase.from('sellers').select('*').eq('user_id', userId).single();
      if (error) throw error;
      return mapSeller(data);
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
  }
};
