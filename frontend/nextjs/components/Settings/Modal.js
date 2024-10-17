// Import necessary dependencies and components
import React, { useState, useEffect } from "react";
import './App.css';
import ChatBox from './ChatBox';
import axios from 'axios';
import { getHost } from '../../helpers/getHost';
import { motion } from 'framer-motion';

// Define the Modal component
export default function Modal({ setChatBoxSettings, chatBoxSettings }) {
  // Force 'search' tab to be active
  const [activeTab] = useState('search');

  // Initialize state for API variables
  const [apiVariables, setApiVariables] = useState({
    ANTHROPIC_API_KEY: '',
    TAVILY_API_KEY: '',
    LANGCHAIN_TRACING_V2: 'true',
    LANGCHAIN_API_KEY: '',
    OPENAI_API_KEY: '',
    DOC_PATH: './my-docs',
    RETRIEVER: 'tavily', // Keep Tavily as the default retriever
    GOOGLE_API_KEY: '',
    GOOGLE_CX_KEY: '',
    BING_API_KEY: '',
    SEARCHAPI_API_KEY: '',
    SERPAPI_API_KEY: '',
    SERPER_API_KEY: '',
    SEARX_URL: '',
    LANGGRAPH_HOST_URL: ''
  });

  // Effect hook to load API variables from localStorage or fetch from server
  useEffect(() => {
    const storedConfig = localStorage.getItem('apiVariables');
    if (storedConfig) {
      // If config exists in localStorage, use it
      setApiVariables(JSON.parse(storedConfig));
    } else {
      // Otherwise, fetch config from server
      axios.get(`${getHost()}/getConfig`)
        .then(response => {
          setApiVariables(response.data);
          // Store fetched config in localStorage
          localStorage.setItem('apiVariables', JSON.stringify(response.data));
        })
        .catch(error => {
          console.error('Error fetching config:', error);
        });
    }
  }, []);

  // Function to handle saving changes
  const handleSaveChanges = () => {
    setChatBoxSettings(chatBoxSettings);
    localStorage.setItem('apiVariables', JSON.stringify(apiVariables));
  };

  // Function to handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setApiVariables(prevState => ({
      ...prevState,
      [name]: value
    }));
    // Update localStorage immediately on input change
    localStorage.setItem('apiVariables', JSON.stringify({
      ...apiVariables,
      [name]: value
    }));
  };

  // Function to render conditional inputs based on selected retriever
  const renderConditionalInputs = () => {
    switch (apiVariables.RETRIEVER) {
      case 'google':
        return (
          <>
            <div className="form-group">
              <label className="form-group-label">GOOGLE_API_KEY</label>
              <input type="text" name="GOOGLE_API_KEY" value={apiVariables.GOOGLE_API_KEY} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-group-label">GOOGLE_CX_KEY</label>
              <input type="text" name="GOOGLE_CX_KEY" value={apiVariables.GOOGLE_CX_KEY} onChange={handleInputChange} />
            </div>
          </>
        );
      // ... (other cases for different retrievers)
      default:
        return null;
    }
  };

  // Render the Modal component
  return (
    <motion.div
      className="settings-modal"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="settings-content">
        {/* Tabs are commented out, only 'search' tab is active */}
        <motion.div
          className="settings-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {activeTab === 'search' && (
            <div className="settings-section">
              <ChatBox setChatBoxSettings={setChatBoxSettings} chatBoxSettings={chatBoxSettings} />
            </div>
          )}
          {/* API tab content is commented out */}
        </motion.div>
      </div>
      <motion.div
        className="settings-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="save-button"
            type="button"
            onClick={handleSaveChanges}
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}