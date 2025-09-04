import { Firestore } from '@google-cloud/firestore';

export const firestoreProvider = {
  provide: Firestore,
  useValue: new Firestore(),
};
