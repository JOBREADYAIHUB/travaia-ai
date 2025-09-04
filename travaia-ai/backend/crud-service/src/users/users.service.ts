import { Injectable } from '@nestjs/common';
import {
  Firestore,
  CollectionReference,
  DocumentData,
} from '@google-cloud/firestore';
import { User } from './dto/user.dto';

@Injectable()
export class UsersService {
  private collection: CollectionReference<DocumentData>;

  constructor(private firestore: Firestore) {
    this.collection = this.firestore.collection('users');
  }

  async create(user: User): Promise<User> {
    const docRef = this.collection.doc(user.id);
    await docRef.set(user);
    return user;
  }

  async findOne(id: string): Promise<User | undefined> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    return doc.exists ? (doc.data() as User) : undefined;
  }
}
