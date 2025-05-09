import React, { createContext } from 'react';
import { TodoList, TodoItem } from '../types';

export interface TodoContextType {
  todoLists: TodoList[];
  addTodoList: (list: Partial<TodoList>) => TodoList;
  updateTodoList: (id: string, list: Partial<TodoList>) => void;
  deleteTodoList: (id: string) => void;
  addTodoItem: (listId: string, item: Partial<TodoItem>) => TodoItem;
  updateTodoItem: (listId: string, itemId: string, item: Partial<TodoItem>) => void;
  deleteTodoItem: (listId: string, itemId: string) => void;
}

export const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const useTodo = (): TodoContextType => {
  const context = React.useContext(TodoContext);
  if (context === undefined) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
}; 