import { z } from 'zod'
import {
  BannerUpdateSchema,
  CategoryCreateSchema,
  CategorySchema,
  CategoryUpdateSchema,
  OrderCreateSchema,
  OrderModalitySchema,
  OrderStatusSchema,
  ProductCreateSchema,
  ProductSchema,
  ProductUpdateSchema,
} from '../schemas'

export type ProductType = z.infer<typeof ProductSchema>
export type ProductCreateType = z.infer<typeof ProductCreateSchema>
export type ProductUpdateType = z.infer<typeof ProductUpdateSchema>

export type CategoryType = z.infer<typeof CategorySchema>
export type CategoryCreateType = z.infer<typeof CategoryCreateSchema>
export type CategoryUpdateType = z.infer<typeof CategoryUpdateSchema>

export type OrderCreateType = z.infer<typeof OrderCreateSchema>
export type OrderStatusType = z.infer<typeof OrderStatusSchema>
export type OrderModalityType = z.infer<typeof OrderModalitySchema>

export type BannerUpdateType = z.infer<typeof BannerUpdateSchema>

export type TikTokVideoType = {
  id: string
  url: string
  order: number
  is_active: boolean
  thumbnail_url: string | null
  created_at: string
}
