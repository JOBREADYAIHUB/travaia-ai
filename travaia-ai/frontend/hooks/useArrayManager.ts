import { useCallback } from 'react';

export interface ArrayItem {
  id: string;
}

export interface UseArrayManagerReturn<T extends ArrayItem> {
  add: (newItem: T) => void;
  update: (id: string, field: keyof T, value: any) => void;
  remove: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}

export const useArrayManager = <T extends ArrayItem>(
  items: T[],
  onChange: (items: T[]) => void
): UseArrayManagerReturn<T> => {
  const add = useCallback((newItem: T) => {
    onChange([...items, newItem]);
  }, [items, onChange]);

  const update = useCallback((id: string, field: keyof T, value: any) => {
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange(updatedItems);
  }, [items, onChange]);

  const remove = useCallback((id: string) => {
    const filteredItems = items.filter(item => item.id !== id);
    onChange(filteredItems);
  }, [items, onChange]);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    const reorderedItems = [...items];
    const [movedItem] = reorderedItems.splice(fromIndex, 1);
    reorderedItems.splice(toIndex, 0, movedItem);
    onChange(reorderedItems);
  }, [items, onChange]);

  return {
    add,
    update,
    remove,
    reorder
  };
};
