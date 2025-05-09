import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TodoList, TodoItem } from '../types';
import { TodoContext } from './TodoContextTypes';

export const TodoProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [todoLists, setTodoLists] = useState<TodoList[]>(
    () => JSON.parse(localStorage.getItem('notara-todolists') || '[]')
  );

  // Sync to localStorage when todoLists change
  useEffect(() => {
    localStorage.setItem('notara-todolists', JSON.stringify(todoLists));
  }, [todoLists]);

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