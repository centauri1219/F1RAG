import ReactMarkdown from 'react-markdown';

interface BubbleProps {
  message: any; // Using any for now to avoid type issues
}

export const Bubble = ({ message }: BubbleProps) => {
  // Try different property names that might exist
  const content = message.content || message.text || message.display || String(message);
  const role = message.role || 'user';
  
  return (
    <div className={`bubble ${role}`}>
      {role === 'assistant' ? (
        <ReactMarkdown>{content}</ReactMarkdown>
      ) : (
        <div>{content}</div>
      )}
    </div>
  );
};