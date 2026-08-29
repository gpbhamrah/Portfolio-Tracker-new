import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { Holding, WatchlistItem } from '../types';

export interface SupabasePortfolio {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseHoldingRow {
  id: string;
  user_id: string;
  portfolio_id?: string | null;
  ticker: string;
  name: string;
  sector: string;
  qty: number;
  buy_price: number;
  buy_date: string;
  cmp?: number;
  sell_price?: number;
  stop_loss?: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseWatchlistRow {
  id: string;
  user_id: string;
  ticker: string;
  name: string;
  sector: string;
  target_entry_price?: number;
  cmp?: number;
  added_date: string;
  target_sell_price?: number;
  stop_loss?: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

class SupabaseDataService {
  /**
   * Helper to ensure active user session
   */
  private async getUserId(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.user?.id || null;
    } catch {
      return null;
    }
  }

  // ==========================================
  // PORTFOLIOS
  // ==========================================

  public async getPortfolios(): Promise<{ success: boolean; data: any[]; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, data: [], error: 'Supabase is not configured' };
    }

    try {
      const userId = await this.getUserId();
      if (!userId) return { success: false, data: [], error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase getPortfolios error:', error.message);
        return { success: false, data: [], error: error.message };
      }

      // If user has no portfolios yet, auto-create default
      if (!data || data.length === 0) {
        const createRes = await this.createPortfolio('Main Portfolio', 'Default investment portfolio', true);
        if (createRes.success && createRes.data) {
          return { success: true, data: [createRes.data] };
        }
      }

      const formatted = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        isDefault: p.is_default ?? false,
        createdAt: p.created_at,
      }));

      return { success: true, data: formatted };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || 'Failed to fetch portfolios' };
    }
  }

  public async createPortfolio(
    name: string,
    description?: string,
    isDefault: boolean = false
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const userId = await this.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          user_id: userId,
          name: name.trim(),
          description: description?.trim() || null,
          is_default: isDefault,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          description: data.description || '',
          isDefault: data.is_default ?? false,
          createdAt: data.created_at,
        },
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create portfolio' };
    }
  }

  public async deletePortfolio(portfolioId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = await this.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', portfolioId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete portfolio' };
    }
  }

  // ==========================================
  // ACTIVE HOLDINGS
  // ==========================================

  public async getHoldings(portfolioId?: string): Promise<{ success: boolean; data: Holding[]; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, data: [], error: 'Supabase is not configured' };
    }

    try {
      const userId = await this.getUserId();
      if (!userId) return { success: false, data: [], error: 'User not authenticated' };

      let query = supabase.from('holdings').select('*').eq('user_id', userId);

      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase getHoldings error:', error.message);
        return { success: false, data: [], error: error.message };
      }

      const holdings: Holding[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        ticker: row.ticker,
        sector: row.sector || 'Other',
        qty: Number(row.qty) || 0,
        buyPrice: Number(row.buy_price) || 0,
        buyDate: row.buy_date || new Date().toISOString().slice(0, 10),
        cmp: Number(row.cmp) || Number(row.buy_price) || 0,
        sellPrice: Number(row.sell_price) || Math.round(Number(row.buy_price) * 1.2 * 100) / 100,
        stopLoss: Number(row.stop_loss) || Math.round(Number(row.buy_price) * 0.9 * 100) / 100,
        notes: row.notes || '',
        updatedAt: row.updated_at || row.created_at,
      }));

      return { success: true, data: holdings };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || 'Failed to load holdings' };
    }
  }

  public async saveHolding(
    holding: Holding,
    portfolioId?: string
  ): Promise<{ success: boolean; data?: Holding; error?: string }> {
    try {
      const userId = await this.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const payload: any = {
        user_id: userId,
        ticker: holding.ticker.toUpperCase(),
        name: holding.name,
        sector: holding.sector || 'Other',
        qty: Number(holding.qty),
        buy_price: Number(holding.buyPrice),
        buy_date: holding.buyDate || new Date().toISOString().slice(0, 10),
        cmp: Number(holding.cmp) || Number(holding.buyPrice),
        sell_price: Number(holding.sellPrice) || 0,
        stop_loss: Number(holding.stopLoss) || 0,
        notes: holding.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (portfolioId) {
        payload.portfolio_id = portfolioId;
      }

      // Check if id is a valid UUID or existing row to update
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(holding.id);

      if (isUUID) {
        // Upsert or update existing holding
        payload.id = holding.id;
        const { data, error } = await supabase
          .from('holdings')
          .upsert(payload)
          .select()
          .single();

        if (error) throw error;
        return {
          success: true,
          data: {
            ...holding,
            id: data.id,
            updatedAt: data.updated_at,
          },
        };
      } else {
        // Insert brand new holding
        const { data, error } = await supabase
          .from('holdings')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return {
          success: true,
          data: {
            ...holding,
            id: data.id,
            updatedAt: data.updated_at,
          },
        };
      }
    } catch (err: any) {
      console.error('Supabase saveHolding error:', err);
      return { success: false, error: err?.message || 'Failed to save holding' };
    }
  }

  public async updateBuyDate(holdingId: string, newDate: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = await this.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase
        .from('holdings')
        .update({
          buy_date: newDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', holdingId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update buy date' };
    }
  }

  public async deleteHolding(holdingId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = await this.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase
        .from('holdings')
        .delete()
        .eq('id', holdingId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete holding' };
    }
  }

  // ==========================================
  // WATCHLIST
  // ==========================================

  public async getWatchlist(): Promise<{ success: boolean; data: WatchlistItem[]; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, data: [], error: 'Supabase is not configured' };
    }

    try {
      const userId = await this.getUserId();
      if (!userId) return { success: false, data: [], error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase getWatchlist error:', error.message);
        return { success: false, data: [], error: error.message };
      }

      const watchlistItems: WatchlistItem[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        ticker: row.ticker,
        sector: row.sector || 'Other',
        targetEntryPrice: Number(row.target_entry_price) || 0,
        cmp: Number(row.cmp) || Number(row.target_entry_price) || 0,
        addedDate: row.added_date || new Date().toISOString().slice(0, 10),
        targetSellPrice: Number(row.target_sell_price) || 0,
        stopLoss: Number(row.stop_loss) || 0,
        notes: row.notes || '',
      }));

      return { success: true, data: watchlistItems };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || 'Failed to load watchlist' };
    }
  }

  public async saveWatchlistItem(
    item: WatchlistItem
  ): Promise<{ success: boolean; data?: WatchlistItem; error?: string }> {
    try {
      const userId = await this.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const payload: any = {
        user_id: userId,
        ticker: item.ticker.toUpperCase(),
        name: item.name,
        sector: item.sector || 'Other',
        target_entry_price: Number(item.targetEntryPrice) || 0,
        cmp: Number(item.cmp) || 0,
        added_date: item.addedDate || new Date().toISOString().slice(0, 10),
        target_sell_price: Number(item.targetSellPrice) || 0,
        stop_loss: Number(item.stopLoss) || 0,
        notes: item.notes || null,
        updated_at: new Date().toISOString(),
      };

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);

      if (isUUID) {
        payload.id = item.id;
        const { data, error } = await supabase
          .from('watchlist')
          .upsert(payload)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data: { ...item, id: data.id } };
      } else {
        const { data, error } = await supabase
          .from('watchlist')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return { success: true, data: { ...item, id: data.id } };
      }
    } catch (err: any) {
      console.error('Supabase saveWatchlistItem error:', err);
      return { success: false, error: err?.message || 'Failed to save watchlist item' };
    }
  }

  public async deleteWatchlistItem(itemId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = await this.getUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete watchlist item' };
    }
  }
}

export const supabaseDataService = new SupabaseDataService();
