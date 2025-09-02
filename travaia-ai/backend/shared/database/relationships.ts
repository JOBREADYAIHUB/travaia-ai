import { getFirestore, FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../models/database-models';

export interface RelationshipConfig {
  parentCollection: string;
  childCollection: string;
  foreignKey: string;
  cascadeDelete: boolean;
  cascadeUpdate: boolean;
}

export class DatabaseRelationshipManager {
  private db = getFirestore();

  // Define all foreign key relationships
  private relationships: RelationshipConfig[] = [
    // User relationships
    {
      parentCollection: COLLECTIONS.USERS,
      childCollection: COLLECTIONS.APPLICATIONS,
      foreignKey: 'user_id',
      cascadeDelete: true,
      cascadeUpdate: false
    },
    {
      parentCollection: COLLECTIONS.USERS,
      childCollection: COLLECTIONS.FAVORITE_JOBS,
      foreignKey: 'user_id',
      cascadeDelete: true,
      cascadeUpdate: false
    },
    {
      parentCollection: COLLECTIONS.USERS,
      childCollection: COLLECTIONS.INTERVIEWS,
      foreignKey: 'user_id',
      cascadeDelete: true,
      cascadeUpdate: false
    },
    {
      parentCollection: COLLECTIONS.USERS,
      childCollection: COLLECTIONS.INTERVIEW_QUESTIONS,
      foreignKey: 'user_id',
      cascadeDelete: true,
      cascadeUpdate: false
    },
    {
      parentCollection: COLLECTIONS.USERS,
      childCollection: COLLECTIONS.AI_REPORTS,
      foreignKey: 'user_id',
      cascadeDelete: true,
      cascadeUpdate: false
    },
    {
      parentCollection: COLLECTIONS.USERS,
      childCollection: COLLECTIONS.DOCUMENTS,
      foreignKey: 'user_id',
      cascadeDelete: true,
      cascadeUpdate: false
    },
    {
      parentCollection: COLLECTIONS.USERS,
      childCollection: COLLECTIONS.RESUME_VERSIONS,
      foreignKey: 'user_id',
      cascadeDelete: true,
      cascadeUpdate: false
    },

    // Application relationships
    {
      parentCollection: COLLECTIONS.APPLICATIONS,
      childCollection: COLLECTIONS.INTERVIEWS,
      foreignKey: 'application_id',
      cascadeDelete: false, // Keep interviews even if application is deleted
      cascadeUpdate: true
    },
    {
      parentCollection: COLLECTIONS.APPLICATIONS,
      childCollection: COLLECTIONS.AI_REPORTS,
      foreignKey: 'application_id',
      cascadeDelete: true,
      cascadeUpdate: true
    },

    // Interview relationships
    {
      parentCollection: COLLECTIONS.INTERVIEWS,
      childCollection: COLLECTIONS.INTERVIEW_ATTEMPTS,
      foreignKey: 'interview_id',
      cascadeDelete: true,
      cascadeUpdate: false
    },
    {
      parentCollection: COLLECTIONS.INTERVIEWS,
      childCollection: COLLECTIONS.AI_REPORTS,
      foreignKey: 'interview_id',
      cascadeDelete: true,
      cascadeUpdate: true
    },

    // Resume template relationships
    {
      parentCollection: COLLECTIONS.RESUME_TEMPLATES,
      childCollection: COLLECTIONS.RESUME_VERSIONS,
      foreignKey: 'template_id',
      cascadeDelete: false, // Keep resume versions even if template is deleted
      cascadeUpdate: true
    }
  ];

  // Validate foreign key constraints
  async validateForeignKeys(): Promise<{ valid: boolean; violations: string[] }> {
    const violations: string[] = [];

    for (const relationship of this.relationships) {
      try {
        console.log(`Validating ${relationship.childCollection} -> ${relationship.parentCollection}`);
        
        const childSnapshot = await this.db.collection(relationship.childCollection).get();
        const parentIds = new Set<string>();

        // Get all parent IDs
        const parentSnapshot = await this.db.collection(relationship.parentCollection).get();
        parentSnapshot.forEach(doc => parentIds.add(doc.id));

        // Check each child document
        for (const childDoc of childSnapshot.docs) {
          const childData = childDoc.data();
          const foreignKeyValue = childData[relationship.foreignKey];

          if (foreignKeyValue && !parentIds.has(foreignKeyValue)) {
            violations.push(
              `${relationship.childCollection}/${childDoc.id}: Invalid ${relationship.foreignKey} = ${foreignKeyValue}`
            );
          }
        }
      } catch (error: any) {
        violations.push(`Error validating ${relationship.childCollection}: ${error.message}`);
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  // Handle cascade delete operations
  async cascadeDelete(parentCollection: string, parentId: string): Promise<void> {
    const batch = this.db.batch();
    let batchCount = 0;

    // Find all relationships where this is the parent
    const cascadeRelationships = this.relationships.filter(
      rel => rel.parentCollection === parentCollection && rel.cascadeDelete
    );

    for (const relationship of cascadeRelationships) {
      try {
        console.log(`Cascading delete from ${parentCollection}/${parentId} to ${relationship.childCollection}`);
        
        const childQuery = this.db
          .collection(relationship.childCollection)
          .where(relationship.foreignKey, '==', parentId);
        
        const childSnapshot = await childQuery.get();

        for (const childDoc of childSnapshot.docs) {
          // Recursively cascade delete if this child is also a parent
          await this.cascadeDelete(relationship.childCollection, childDoc.id);
          
          // Delete the child document
          batch.delete(childDoc.ref);
          batchCount++;

          // Commit batch every 500 operations
          if (batchCount >= 500) {
            await batch.commit();
            batchCount = 0;
          }
        }
      } catch (error: any) {
        console.error(`Error cascading delete to ${relationship.childCollection}:`, error.message);
      }
    }

    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  // Handle cascade update operations
  async cascadeUpdate(parentCollection: string, parentId: string, updates: any): Promise<void> {
    const batch = this.db.batch();
    let batchCount = 0;

    // Find all relationships where this is the parent
    const cascadeRelationships = this.relationships.filter(
      rel => rel.parentCollection === parentCollection && rel.cascadeUpdate
    );

    for (const relationship of cascadeRelationships) {
      try {
        console.log(`Cascading update from ${parentCollection}/${parentId} to ${relationship.childCollection}`);
        
        const childQuery = this.db
          .collection(relationship.childCollection)
          .where(relationship.foreignKey, '==', parentId);
        
        const childSnapshot = await childQuery.get();

        for (const childDoc of childSnapshot.docs) {
          // Prepare updates for child document
          const childUpdates: any = {
            updated_at: FieldValue.serverTimestamp()
          };

          // Add specific field updates based on relationship type
          if (parentCollection === COLLECTIONS.APPLICATIONS) {
            if (updates.company_name) childUpdates.company_name = updates.company_name;
            if (updates.position_title) childUpdates.position_title = updates.position_title;
          }

          batch.update(childDoc.ref, childUpdates);
          batchCount++;

          if (batchCount >= 500) {
            await batch.commit();
            batchCount = 0;
          }
        }
      } catch (error: any) {
        console.error(`Error cascading update to ${relationship.childCollection}:`, error.message);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  }

  // Create reference helpers
  createReference(collection: string, documentId: string) {
    return this.db.collection(collection).doc(documentId);
  }

  // Validate reference exists
  async validateReference(collection: string, documentId: string): Promise<boolean> {
    try {
      const doc = await this.db.collection(collection).doc(documentId).get();
      return doc.exists;
    } catch (error) {
      return false;
    }
  }

  // Get related documents
  async getRelatedDocuments(parentCollection: string, parentId: string, childCollection: string): Promise<any[]> {
    const relationship = this.relationships.find(
      rel => rel.parentCollection === parentCollection && rel.childCollection === childCollection
    );

    if (!relationship) {
      throw new Error(`No relationship found between ${parentCollection} and ${childCollection}`);
    }

    const query = this.db
      .collection(childCollection)
      .where(relationship.foreignKey, '==', parentId);
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Batch operations with relationship validation
  async batchCreateWithValidation(operations: Array<{
    collection: string;
    data: any;
    id?: string;
  }>): Promise<void> {
    const batch = this.db.batch();

    // Validate all foreign key references first
    for (const operation of operations) {
      await this.validateDocumentReferences(operation.collection, operation.data);
    }

    // Execute batch operations
    for (const operation of operations) {
      const docRef = operation.id 
        ? this.db.collection(operation.collection).doc(operation.id)
        : this.db.collection(operation.collection).doc();
      
      batch.set(docRef, {
        ...operation.data,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
  }

  // Validate all foreign key references in a document
  private async validateDocumentReferences(collection: string, data: any): Promise<void> {
    const relationships = this.relationships.filter(rel => rel.childCollection === collection);

    for (const relationship of relationships) {
      const foreignKeyValue = data[relationship.foreignKey];
      
      if (foreignKeyValue) {
        const isValid = await this.validateReference(relationship.parentCollection, foreignKeyValue);
        if (!isValid) {
          throw new Error(
            `Invalid ${relationship.foreignKey}: ${foreignKeyValue} does not exist in ${relationship.parentCollection}`
          );
        }
      }
    }
  }

  // Clean up orphaned documents
  async cleanupOrphanedDocuments(): Promise<{ cleaned: number; errors: string[] }> {
    let cleanedCount = 0;
    const errors: string[] = [];

    for (const relationship of this.relationships) {
      try {
        console.log(`Cleaning orphaned documents in ${relationship.childCollection}`);
        
        const childSnapshot = await this.db.collection(relationship.childCollection).get();
        const parentIds = new Set<string>();

        // Get all valid parent IDs
        const parentSnapshot = await this.db.collection(relationship.parentCollection).get();
        parentSnapshot.forEach(doc => parentIds.add(doc.id));

        const batch = this.db.batch();
        let batchCount = 0;

        for (const childDoc of childSnapshot.docs) {
          const childData = childDoc.data();
          const foreignKeyValue = childData[relationship.foreignKey];

          if (foreignKeyValue && !parentIds.has(foreignKeyValue)) {
            batch.delete(childDoc.ref);
            batchCount++;
            cleanedCount++;

            if (batchCount >= 500) {
              await batch.commit();
              batchCount = 0;
            }
          }
        }

        if (batchCount > 0) {
          await batch.commit();
        }
      } catch (error: any) {
        errors.push(`Error cleaning ${relationship.childCollection}: ${error.message}`);
      }
    }

    return { cleaned: cleanedCount, errors };
  }

  // Get relationship statistics
  async getRelationshipStats(): Promise<{ [key: string]: any }> {
    const stats: { [key: string]: any } = {};

    for (const relationship of this.relationships) {
      try {
        const childSnapshot = await this.db.collection(relationship.childCollection).get();
        const parentSnapshot = await this.db.collection(relationship.parentCollection).get();
        
        stats[`${relationship.parentCollection}_to_${relationship.childCollection}`] = {
          parentCount: parentSnapshot.size,
          childCount: childSnapshot.size,
          cascadeDelete: relationship.cascadeDelete,
          cascadeUpdate: relationship.cascadeUpdate
        };
      } catch (error: any) {
        stats[`${relationship.parentCollection}_to_${relationship.childCollection}`] = {
          error: error.message
        };
      }
    }

    return stats;
  }
}

// Firestore trigger functions for maintaining relationships
export class RelationshipTriggers {
  private relationshipManager = new DatabaseRelationshipManager();

  // Handle document deletion with cascade
  async onDocumentDelete(collection: string, documentId: string): Promise<void> {
    console.log(`Document deleted: ${collection}/${documentId}`);
    await this.relationshipManager.cascadeDelete(collection, documentId);
  }

  // Handle document update with cascade
  async onDocumentUpdate(collection: string, documentId: string, before: any, after: any): Promise<void> {
    console.log(`Document updated: ${collection}/${documentId}`);
    
    // Only cascade if relevant fields changed
    const relevantChanges = this.getRelevantChanges(collection, before, after);
    
    if (Object.keys(relevantChanges).length > 0) {
      await this.relationshipManager.cascadeUpdate(collection, documentId, relevantChanges);
    }
  }

  // Handle document creation with validation
  async onDocumentCreate(collection: string, documentId: string, data: any): Promise<void> {
    console.log(`Document created: ${collection}/${documentId}`);
    
    // Validate foreign key references
    try {
      await this.relationshipManager['validateDocumentReferences'](collection, data);
    } catch (error: any) {
      console.error(`Foreign key validation failed for ${collection}/${documentId}:`, error.message);
      // In production, you might want to delete the invalid document or send an alert
    }
  }

  private getRelevantChanges(collection: string, before: any, after: any): any {
    const changes: any = {};

    // Define which fields should trigger cascade updates
    const relevantFields: { [key: string]: string[] } = {
      [COLLECTIONS.APPLICATIONS]: ['company_name', 'position_title', 'status'],
      [COLLECTIONS.USERS]: ['email', 'profile_data'],
      [COLLECTIONS.INTERVIEWS]: ['status', 'score']
    };

    const fieldsToCheck = relevantFields[collection] || [];

    for (const field of fieldsToCheck) {
      if (before[field] !== after[field]) {
        changes[field] = after[field];
      }
    }

    return changes;
  }
}

export default DatabaseRelationshipManager;
