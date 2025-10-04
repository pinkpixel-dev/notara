import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TodoList, TodoItem } from '../types';
import { TodoContext } from './TodoContextTypes';
import { useFileSystem } from './FileSystemContext';

export const TodoProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { status, loadTodos, saveTodos } = useFileSystem();
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [isInitialised, setIsInitialised] = useState(false);

  const isBrowser = typeof window !== 'undefined';

  const loadFromLocalStorage = (): TodoList[] => {
    if (!isBrowser) {
      return [];
    }
    try {
      const stored = window.localStorage.getItem('notara-todolists');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to read todo lists from localStorage', error);
      return [];
    }
  };

  const persistToLocalStorage = (lists: TodoList[]) => {
    if (!isBrowser) {
      return;
    }
    try {
      window.localStorage.setItem('notara-todolists', JSON.stringify(lists));
    } catch (error) {
      console.error('Failed to persist todo lists to localStorage', error);
    }
  };

  useEffect(() => {
    if (status === 'uninitialized') {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setIsInitialised(false);

      if (status === 'ready') {
        try {
          const stored = await loadTodos();
          if (!cancelled) {
            setTodoLists(stored ?? []);
          }
        } catch (error) {
          console.error('Falling back to local storage after todo FS load failure', error);
          if (!cancelled) {
            setTodoLists(loadFromLocalStorage());
          }
        }
      } else {
        if (!cancelled) {
          setTodoLists(loadFromLocalStorage());
        }
      }

      if (!cancelled) {
        setIsInitialised(true);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [loadTodos, status]);

  useEffect(() => {
    if (!isInitialised) {
      return;
    }

    if (status === 'ready') {
      void saveTodos(todoLists).catch((error) => {
        console.error('Error saving todo lists to filesystem', error);
        persistToLocalStorage(todoLists);
      });
      persistToLocalStorage(todoLists);
    } else {
      persistToLocalStorage(todoLists);
    }
  }, [isInitialised, saveTodos, status, todoLists]);

  const addTodoList = (list: Partial<TodoList>) => {
    const now = new Date();
    const dateStr = list.date || now.toISOString().split('T')[0];
    const timeStr = list.time || '12:00';
    const newList: TodoList = {
      id: uuidv4(),
      title: list.title || 'New List',
      date: dateStr,
      time: timeStr,
      items: list.items || []
    };
    setTodoLists([...todoLists, newList]);
    return newList;
  };

  const updateTodoList = (id: string, list: Partial<TodoList>) => {
    setTodoLists(todoLists.map(l => l.id === id ? { ...l, ...list } : l));
  };

  const deleteTodoList = (id: string) => {
    setTodoLists(todoLists.filter(l => l.id !== id));
  };

  const addTodoItem = (listId: string, item: Partial<TodoItem>) => {
    const newItem: TodoItem = {
      id: uuidv4(),
      content: item.content || '',
      checked: item.checked || false,
      time: item.time || '12:00',
      subItems: item.subItems || []
    };
    setTodoLists(todoLists.map(l => l.id === listId ? { ...l, items: [...l.items, newItem] } : l));
    return newItem;
  };

  const updateTodoItem = (listId: string, itemId: string, item: Partial<TodoItem>) => {
    setTodoLists(todoLists.map(l => {
      if (l.id === listId) {
        return {
          ...l,
          items: l.items.map(i => i.id === itemId ? { ...i, ...item } : i)
        };
      }
      return l;
    }));
  };

  const deleteTodoItem = (listId: string, itemId: string) => {
    setTodoLists(todoLists.map(l => {
      if (l.id === listId) {
        return { ...l, items: l.items.filter(i => i.id !== itemId) };
      }
      return l;
    }));
  };

  return (
    <TodoContext.Provider value={{
      todoLists,
      addTodoList,
      updateTodoList,
      deleteTodoList,
      addTodoItem,
      updateTodoItem,
      deleteTodoItem
    }}>
      {children}
    </TodoContext.Provider>
  );
}; 
