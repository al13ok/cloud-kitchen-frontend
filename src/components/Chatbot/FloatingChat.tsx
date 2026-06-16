'use client';

import React, { useState, useEffect } from 'react';
import ChatbotComponent from './Chatbot';
import styles from './Chatbot.module.css';
import Image from 'next/image';

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('/images/user/Bot1.png');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Initialize avatar from localStorage after component mounts
    const savedAvatar = localStorage.getItem('selectedChatbotAvatar');
    if (savedAvatar) {
      setSelectedAvatar(savedAvatar);
    }
  }, []);

  useEffect(() => {
    const handleAvatarChange = (event: CustomEvent) => {
      setSelectedAvatar(event.detail.avatarPath);
    };

    window.addEventListener('avatarChanged', handleAvatarChange as EventListener);
    return () => {
      window.removeEventListener('avatarChanged', handleAvatarChange as EventListener);
    };
  }, []);

  const toggleChat = () => {
    setIsOpen(prev => !prev);
  };

  if (!isClient) {
    // Return a placeholder with the same dimensions during SSR
    return (
      <button 
        className={styles.floatingChatButton}
        aria-label="Open chat"
        type="button"
      >
        <div style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative',
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: '#f3f4f6' // Light gray placeholder
        }} />
      </button>
    );
  }

  return (
    <>
      {isOpen && <ChatbotComponent toggleChatbot={toggleChat} />}
      <button 
        className={styles.floatingChatButton}
        onClick={toggleChat}
        aria-label="Open chat"
        type="button"
      >
        <div style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative',
          borderRadius: '50%',
          overflow: 'hidden'
        }}>
          <Image 
            src={selectedAvatar} 
            alt="Chat Avatar" 
            fill
            sizes="(max-width: 768px) 100vw, 50px"
            priority
            style={{ 
              objectFit: 'cover'
            }} 
          />
        </div>
      </button>
    </>
  );
};

export default FloatingChat; 