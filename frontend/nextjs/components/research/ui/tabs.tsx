import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: TabsListProps) {
  return <div className={className}>{children}</div>;
}

export function TabsTrigger({ value, children, onClick, className }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { activeTab, setActiveTab } = context;

  const handleClick = () => {
    setActiveTab(value);
    if (onClick) onClick();
  };

  return (
    <button
      className={`px-4 py-2 rounded-t-lg ${
        activeTab === value ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'
      } ${className || ''}`}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const { activeTab } = context;

  if (activeTab !== value) return null;

  return <div className={className}>{children}</div>;
}