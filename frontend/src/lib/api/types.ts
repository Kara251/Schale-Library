/**
 * Strapi API 跨域基础类型：响应包装、媒体结构与多个域模块共用的实体类型。
 */

export type ContentIdentifier = string | number;

/**
 * Strapi 响应类型定义
 */
export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiSingleResponse<T> {
  data: T;
  meta: Record<string, never>;
}

/**
 * Strapi 媒体文件类型
 */
export interface StrapiMedia {
  id: number;
  documentId: string;
  name: string;
  alternativeText?: string;
  caption?: string;
  width: number;
  height: number;
  formats?: {
    thumbnail?: MediaFormat;
    small?: MediaFormat;
    medium?: MediaFormat;
    large?: MediaFormat;
  };
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  url: string;
}

/** 剧透档位：由编辑维护的剧透程度分级，随游戏进度调整（数据驱动，替代旧的写死枚举）。
 *  被 research（条目的 spoiler_tier 字段）与 misc（spoiler-tiers 聚合）两个域引用，故置于 types。 */
export interface SpoilerTier {
  id: number;
  documentId: string;
  name: string;
  key: string;
  order: number;
  locale?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

/**
 * 公告类型
 */
export interface Announcement {
  id: number;
  documentId: string;
  title: string;
  content: string;
  coverImage?: StrapiMedia;
  link?: string;
  priority: number;
  isPinned?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

export interface FriendLink {
  id: number;
  documentId: string;
  title: string;
  description?: string;
  url: string;
  icon?: StrapiMedia;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

/**
 * 学生类型
 */
export type SchoolType = 'abydos' | 'gehenna' | 'millennium' | 'trinity' | 'hyakkiyako' | 'shanhaijing' | 'redwinter' | 'valkyrie' | 'arius' | 'srt' | 'tokiwadai' | 'kronos' | 'other';

export interface Student {
  id: number;
  documentId: string;
  name: string;
  school?: SchoolType;
  school_ref?: { id: number; documentId: string; name: string; slug: string; color?: string } | null;
  organization?: string;
  avatar?: StrapiMedia;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}
