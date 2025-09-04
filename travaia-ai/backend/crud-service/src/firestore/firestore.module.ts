import { Module } from '@nestjs/common';
import { firestoreProvider } from './firestore.provider';

@Module({
  providers: [firestoreProvider],
  exports: [firestoreProvider],
})
export class FirestoreModule {}
