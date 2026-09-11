import { api } from './client';
import type { Profile } from '@/types/api';

export function getProfile() {
  return api.get<Profile>('/users/me');
}

// The response uses snake_case (full_name, avatar_url, bio) but the PATCH
// body is camelCase — an intentional asymmetry in the backend's Zod schema.
export interface UpdateProfileInput {
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
}

export function updateProfile(fields: UpdateProfileInput) {
  return api.patch<Profile>('/users/me', fields);
}
