import apiService from './apiService';
import { ResumeTemplate, ResumeCategory } from '../types';

/**
 * Fetches the global resume templates from the backend API.
 * @returns {Promise<ResumeTemplate[]>} A promise that resolves to an array of resume templates.
 */
export const getResumeTemplates = async (): Promise<ResumeTemplate[]> => {
  try {
    const response = await apiService.get<ResumeTemplate[]>(
      '/global/resume-templates',
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching resume templates:', error);
    // Depending on the desired UX, you might want to throw the error
    // or return an empty array.
    return [];
  }
};

/**
 * Fetches the global resume categories from the backend API.
 * @returns {Promise<ResumeCategory[]>} A promise that resolves to an array of resume categories.
 */
export const getResumeCategories = async (): Promise<ResumeCategory[]> => {
  try {
    const response = await apiService.get<ResumeCategory[]>(
      '/global/resume-categories',
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching resume categories:', error);
    // Depending on the desired UX, you might want to throw the error
    // or return an empty array.
    return [];
  }
};
