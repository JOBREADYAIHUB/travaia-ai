import { JobApplication, UserProfile } from '../types'; // Assuming UserProfile might be needed for context in future
import { auth } from '../firebaseConfig'; // To get the ID token

const getFirebaseIdToken = async (): Promise<string | null> => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    return await currentUser.getIdToken(true);
  }
  return null;
};

const processStream = async (
  endpoint: string,
  payload: any,
  onChunk: (chunk: string) => void,
  onError: (errorMsg: string) => void,
  onComplete?: () => void,
): Promise<void> => {
  const token = await getFirebaseIdToken();
  if (!token) {
    onError('User not authenticated.');
    if (onComplete) onComplete();
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      onError(
        `Error from backend: ${errorData.message || response.statusText}`,
      );
      if (onComplete) onComplete();
      return;
    }

    if (
      response.headers.get('Content-Type')?.includes('text/event-stream') &&
      response.body
    ) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let eolIndex;
        while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
          const line = buffer.substring(0, eolIndex).trim();
          buffer = buffer.substring(eolIndex + 2);

          if (line.startsWith('data: ')) {
            const dataStr = line.substring('data: '.length);
            if (dataStr === '[DONE]') {
              if (onComplete) onComplete();
              return;
            }
            try {
              const chunkData = JSON.parse(dataStr);
              if (chunkData.text) {
                // Common pattern for streamed text
                onChunk(chunkData.text);
              } else if (chunkData.error) {
                // Backend can send error in stream
                onError(chunkData.error);
                if (onComplete) onComplete(); // Ensure onComplete is called on error too
                return;
              } else {
                // Other JSON structures, pass as string for now
                onChunk(dataStr);
              }
            } catch (e) {
              // If not JSON, might be plain text chunk (less common for structured SSE)
              onChunk(dataStr);
            }
          }
        }
      }
      if (buffer.length > 0 && onComplete) {
        onChunk(buffer);
      }
      if (onComplete) onComplete();
    } else {
      // Non-streaming response (e.g. direct JSON from Genkit flow)
      const data = await response.json();
      if (typeof data === 'object' && data !== null) {
        if (data.text) {
          // For flows designed to output a single text block
          onChunk(data.text);
        } else if (data.analysis) {
          // For resumeAnalyzerFlow
          onChunk(data.analysis);
        } else if (data.tips) {
          // For applicationImprovementTipsFlow
          onChunk(data.tips);
        } else if (data.suggestions && Array.isArray(data.suggestions)) {
          // For suggestJobTitlesFlow
          onChunk(JSON.stringify(data.suggestions)); // Send array as JSON string
        } else {
          onChunk(JSON.stringify(data)); // Fallback: stringify the whole object
        }
      } else {
        onChunk(String(data)); // If data is primitive
      }
      if (onComplete) onComplete();
    }
  } catch (error: any) {
    onError(error.message || 'Failed to fetch from backend.');
    if (onComplete) onComplete();
  }
};

export const suggestJobTitles = async (
  partialTitle: string,
): Promise<string[]> => {
  const token = await getFirebaseIdToken();
  if (!token) {
    console.error('User not authenticated for suggesting job titles.');
    return Promise.reject(new Error('User not authenticated.'));
  }

  try {
    // Updated endpoint to call Genkit flow via backend
    const response = await fetch('/api/ai/genkit/suggest-job-titles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ partialTitle }),
    });
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: 'Failed to suggest job titles' }));
      throw new Error(errorData.message || `Error ${response.status}`);
    }
    const data = await response.json();
    // Assuming the Genkit flow returns { suggestions: ["title1", "title2"] }
    return data.suggestions || [];
  } catch (error) {
    throw error;
  }
};

export const streamAnalyzeJobDescriptionContent = (
  description: string,
  onChunk: (chunk: string) => void,
  onError: (errorMsg: string) => void,
  onComplete?: () => void,
) => {
  // Updated endpoint to call Genkit flow. processStream will handle JSON response.
  processStream(
    '/api/ai/genkit/analyze-job-description',
    { description },
    onChunk,
    onError,
    onComplete,
  );
};

export const streamGetApplicationImprovementTips = (
  application: JobApplication,
  onChunk: (chunk: string) => void,
  onError: (errorMsg: string) => void,
  onComplete?: () => void,
) => {
  // Updated endpoint to call Genkit flow. processStream will handle JSON response.
  processStream(
    '/api/ai/genkit/application-improvement-tips',
    { application },
    onChunk,
    onError,
    onComplete,
  );
};

// callSuggestTags remains mostly the same as it was already calling a backend endpoint
// that should now be a Genkit flow.
export const callSuggestTags = async (payload: {
  documentText?: string;
  fileName: string;
  locale: string;
}) => {
  const token = await getFirebaseIdToken();
  if (!token) {
    console.error('User not authenticated for suggesting tags.');
    return Promise.reject(new Error('User not authenticated.'));
  }
  try {
    // Endpoint /api/suggest/tags should now be handled by a Genkit flow in the backend
    const response = await fetch('/api/suggest/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: 'Failed to suggest tags' }));
      throw new Error(errorData.message || `Error ${response.status}`);
    }
    const data = await response.json();
    // Assuming flow returns { tags: ["tag1", "tag2"] }
    return data.tags || [];
  } catch (error) {
    throw error;
  }
};
