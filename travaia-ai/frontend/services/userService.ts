import apiService from './apiService';
import { UserProfile } from '../types';

/**
 * Fetches the authenticated user's profile from the backend.
 * @returns {Promise<UserProfile>} A promise that resolves to the user's profile.
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await apiService.get<UserProfile>('/user/profile');
  return response.data;
};

/**
 * Creates or updates the user's profile on the backend.
 * @param {Partial<UserProfile>} profileData - The profile data to update.
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (
  profileData: Partial<UserProfile>,
): Promise<void> => {
  await apiService.post('/user/profile', profileData);
};
