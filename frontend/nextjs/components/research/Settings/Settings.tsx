import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon } from 'lucide-react';
import Modal from '@/components/research/Settings/Modal';

const Settings = ({ setChatBoxSettings, chatBoxSettings }: { setChatBoxSettings: React.Dispatch<React.SetStateAction<any>>, chatBoxSettings: any }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="settings-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="settings-button"
        aria-label="Settings"
      >
        <SettingsIcon size={24} />
      </button>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="settings-accordion"
      >
        <Modal setChatBoxSettings={setChatBoxSettings} chatBoxSettings={chatBoxSettings} />
      </motion.div>
    </div>
  );
};

export default Settings;