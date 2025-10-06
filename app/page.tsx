'use client';

import Image from 'next/image';
import logo from './assets/logo.png';
import { useState } from 'react';
import { PromptSuggestionRow } from './components/PromptSuggestionRow';
import { LoadingBubble } from './components/LoadingBubble';
import { Bubble } from './components/Bubble';

const Home = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantContent += chunk;
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const noMessages = messages.length === 0;

  return (
    <main>
      <Image src={logo} width="250" alt="logo" />
      <section className={noMessages ? '' : 'populated'}>
        {noMessages ? (
          <>
            <p className="starter-text">
              Ask an F1 question and get the latest answers.
            </p>
            <br />
            <PromptSuggestionRow onPromptClick={handlePromptClick} />
          </>
        ) : (
          <div className="messages-container">
            {messages.map((message, index) => (
              <Bubble key={`message-${index}`} message={message} />
            ))}
            {isLoading && <LoadingBubble />}
          </div>
        )}
      </section>
      <form onSubmit={handleSubmit}>
        <input
          className="question-box"
          onChange={handleInputChange}
          value={input}
          placeholder="Ask a question"
        />
        <input type="submit" />
      </form>
    </main>
  );
};

export default Home;